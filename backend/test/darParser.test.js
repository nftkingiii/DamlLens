import test from "node:test";
import assert from "node:assert/strict";
import { parseDamlLfInspect } from "../src/dar/parser.js";

const archive = {
  main_package_id: "abc123abc123abc123",
  packages: {
    abc123abc123abc123: { name: "sample-workflows", version: "1.0.0" },
  },
};

const inspect = `package abc123abc123abc123
daml-lf 2.2
metadata sample-workflows-1.0.0

module Sample.First where
record @serializable Approve = {note : Text}
record @serializable Request =
  {owner : Party;
   reviewer : Party;
   amount : Numeric 10}
def $csignatory : Sample.First:Request -> List Party =
  \\(this : Sample.First:Request).
    Sample.First:Request.owner this
def $cobserver : Sample.First:Request -> List Party =
  \\(this : Sample.First:Request).
    Sample.First:Request.reviewer this
def $$controller : Sample.First:Request -> Sample.First:Approve -> List Party =
  \\(this : Sample.First:Request) (arg : Sample.First:Approve).
    Sample.First:Request.reviewer this
template Request this where
  signatory Sample.First:$csignatory this
  observer Sample.First:$cobserver this
  consuming choice Approve (self : ContractId Sample.First:Request) (arg : Sample.First:Approve) : ContractId Sample.First:Approved
    controller Sample.First:$$controller this arg
    observer Just (nil @Party)
    authority Nothing
    do upure @Unit unit

module Sample.Second where
record @serializable Finish = {}
record @serializable Task = {operator : Party}
def $csignatory : Sample.Second:Task -> List Party =
  \\(this : Sample.Second:Task).
    Sample.Second:Task.operator this
def $$controller : Sample.Second:Task -> Sample.Second:Finish -> List Party =
  \\(this : Sample.Second:Task) (arg : Sample.Second:Finish).
    Sample.Second:Task.operator this
template Task this where
  signatory Sample.Second:$csignatory this
  observer Just (nil @Party)
  consuming choice Finish (self : ContractId Sample.Second:Task) (arg : Sample.Second:Finish) : Unit
    controller Sample.Second:$$controller this arg
    observer Just (nil @Party)
    authority Nothing
    do upure @Unit unit
`;

test("decodes modules, inline records, authority, arguments, and transitions", () => {
  const result = parseDamlLfInspect(inspect, archive, { sdkVersion: "3.5.2" });
  assert.equal(result.packageId, archive.main_package_id);
  assert.equal(result.modules.length, 2);
  assert.equal(result.templates.length, 2);

  const request = result.templates.find((template) => template.name === "Request");
  assert.deepEqual(request.signatories, ["owner"]);
  assert.deepEqual(request.observers, ["reviewer"]);
  assert.equal(request.fields[2].type, "numeric");
  assert.deepEqual(request.choices[0].controllers, ["reviewer"]);
  assert.deepEqual(request.choices[0].arguments, [{ name: "note", type: "text", required: true }]);
  assert.equal(request.choices[0].creates, "Approved");
  assert.equal(request.choices[0].controllerConfidence, "static");

  const task = result.templates.find((template) => template.name === "Task");
  assert.deepEqual(task.signatories, ["operator"]);
  assert.deepEqual(task.choices[0].controllers, ["operator"]);
  assert.equal(task.choices[0].creates, null);
});

test("rejects compiler output without templates", () => {
  assert.throws(
    () => parseDamlLfInspect("package abc123abc123abc123\ndaml-lf 2.2\n", archive),
    /No templates/,
  );
});
