const COMPLEX_EXPRESSION = /\b(case|if|fold|filter|map|lookup|fetch|exercise|throw)\b/;

export function parseDamlLfInspect(inspectText, archive = {}, options = {}) {
  if (!inspectText?.trim()) throw new Error("damlc inspect returned no Daml-LF output");

  const packageId = archive.main_package_id || matchLine(inspectText, /^package\s+(\S+)/m);
  const damlLfVersion = matchLine(inspectText, /^daml-lf\s+(\S+)/m);
  const metadata = archive.packages?.[packageId] || {};
  const metadataName = matchLine(inspectText, /^metadata\s+(\S+)/m);
  const modules = parseModules(inspectText)
    .map(({ name, text }) => ({
      name,
      templates: parseTemplates(text, name, parseRecords(text), parseDefinitions(text)),
    }))
    .filter((module) => module.templates.length);
  const templates = modules.flatMap((module) => module.templates);

  if (!packageId) throw new Error("Could not determine the DAR main package id");
  if (!templates.length) throw new Error("No templates were found in the DAR main package");

  const packageName = metadata.name || packageNameFromMetadata(metadataName) || "unknown-package";
  return {
    source: "dar",
    packageId,
    packageName,
    packageVersion: metadata.version || null,
    damlLfVersion: damlLfVersion || null,
    moduleName: modules.length === 1 ? modules[0].name : `${modules.length} decoded modules`,
    description: `${templates.length} templates decoded from ${packageName}. Authority labels describe what can be proven statically from Daml-LF.`,
    decodedAt: new Date().toISOString(),
    decoder: {
      strategy: "damlc-inspect",
      sdkVersion: options.sdkVersion || null,
      authorityLevels: ["static", "computed", "dynamic"],
    },
    dependencies: Math.max(0, Object.keys(archive.packages || {}).length - 1),
    modules,
    templates,
  };
}

function parseModules(text) {
  const matches = [...text.matchAll(/^module\s+([^\s]+)\s+where\s*$/gm)];
  return matches.map((match, index) => ({
    name: match[1],
    text: text.slice(match.index, matches[index + 1]?.index ?? text.length),
  }));
}

function parseRecords(text) {
  const records = new Map();
  const matches = [...text.matchAll(/^record @serializable\s+([^\s=]+)[ \t]*=[ \t]*/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const nextRecord = matches[index + 1]?.index ?? text.length;
    const nextDeclaration = findNextTopLevel(text, match.index + match[0].length);
    const end = Math.min(nextRecord, nextDeclaration);
    const block = text.slice(match.index + match[0].length, end);
    const open = block.indexOf("{");
    const close = block.lastIndexOf("}");
    const body = open === -1 || close === -1 ? "" : block.slice(open + 1, close);
    const fields = body
      .split(";")
      .map((entry) => entry.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf(" : ");
        return separator === -1
          ? null
          : { name: entry.slice(0, separator).trim(), type: normalizeType(entry.slice(separator + 3)) };
      })
      .filter(Boolean);
    records.set(match[1], fields);
  }
  return records;
}

function parseDefinitions(text) {
  const definitions = new Map();
  const matches = [...text.matchAll(/^def\s+(.+?)\s+:/gm)];
  for (let index = 0; index < matches.length; index += 1) {
    definitions.set(matches[index][1], text.slice(matches[index].index, matches[index + 1]?.index ?? text.length));
  }
  return definitions;
}

function parseTemplates(moduleText, moduleName, records, definitions) {
  const matches = [...moduleText.matchAll(/^template\s+([^\s]+)\s+\S+\s+where\s*$/gm)];
  return matches.map((match, index) => {
    const name = match[1];
    const block = moduleText.slice(match.index, matches[index + 1]?.index ?? moduleText.length);
    const signatory = authorityFromLine(block, "signatory", moduleName, name, records, definitions);
    const observer = authorityFromLine(block, "observer", moduleName, name, records, definitions);
    return {
      name,
      moduleName,
      businessState: humanize(name),
      fields: records.get(name) || [],
      signatories: signatory.fields,
      observers: observer.fields,
      authority: { signatory, observer },
      choices: parseChoices(block, moduleName, name, records, definitions),
    };
  });
}

function parseChoices(block, moduleName, templateName, records, definitions) {
  const pattern = /^\s{2}(consuming|nonconsuming) choice\s+([^\s]+).*?\(arg\s*:\s*([^\)]+)\)\s*:\s*(.+)$/gm;
  const matches = [...block.matchAll(pattern)].filter((match) => match[2] !== "Archive");
  return matches.map((match, index) => {
    const choiceBlock = block.slice(match.index, matches[index + 1]?.index ?? block.length);
    const controller = authorityFromLine(choiceBlock, "controller", moduleName, templateName, records, definitions);
    const returnType = match[4].trim();
    return {
      name: match[2],
      consuming: match[1] === "consuming",
      controllers: controller.fields,
      controllerConfidence: controller.confidence,
      controllerExpression: controller.expression,
      creates: inferCreatedTemplate(returnType),
      returnType,
      arguments: (records.get(entityName(match[3].trim())) || []).map((field) => ({ ...field, required: true })),
      requiresMultipleParties: controller.fields.length > 1,
    };
  });
}

function authorityFromLine(block, keyword, moduleName, templateName, records, definitions) {
  const line = block.match(new RegExp(`^\\s{2,4}${keyword}\\s+(.+)$`, "m"))?.[1]?.trim();
  if (!line || line === "Just (nil @Party)") return authority([], "static", line || "none");
  const reference = line.match(/(?:^|:)(\$[^\s]+)(?:\s|$)/)?.[1];
  const definition = reference ? findDefinition(definitions, reference) : "";
  const partyFields = new Set(
    (records.get(templateName) || []).filter((item) => item.type === "party").map((item) => item.name),
  );
  const pattern = new RegExp(
    `${escapeRegExp(moduleName)}:${escapeRegExp(templateName)}\\.([A-Za-z0-9_$]+)\\s+this`,
    "g",
  );
  const fields = [...(definition || line).matchAll(pattern)]
    .map((match) => match[1])
    .filter((field) => partyFields.has(field));
  const uniqueFields = [...new Set(fields)];
  const confidence = uniqueFields.length
    ? COMPLEX_EXPRESSION.test(definition) ? "computed" : "static"
    : /nil\s+@Party/.test(definition) ? "static" : "dynamic";
  return authority(uniqueFields, confidence, reference || line);
}

function findDefinition(definitions, shortReference) {
  const exact = definitions.get(shortReference);
  if (exact) return exact;
  for (const [name, body] of definitions) {
    if (name.endsWith(`:${shortReference}`)) return body;
  }
  return "";
}

function authority(fields, confidence, expression) {
  return { fields: [...new Set(fields)], confidence, expression: String(expression || "none").slice(0, 240) };
}

function inferCreatedTemplate(returnType) {
  return returnType.match(/ContractId\s+(?:[^\s:]+:)*([^\s\)]+)/)?.[1] || null;
}

function normalizeType(type) {
  const clean = type.replace(/[}\s]+$/g, "").trim();
  if (clean === "Party") return "party";
  if (clean === "Text") return "text";
  if (clean === "Date") return "date";
  if (clean === "Timestamp") return "timestamp";
  if (clean === "Bool") return "bool";
  if (clean.startsWith("Numeric")) return "numeric";
  if (clean === "Int64") return "int64";
  return clean;
}

function entityName(value) {
  return value.split(":").at(-1);
}

function humanize(value) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function packageNameFromMetadata(metadata) {
  return metadata?.replace(/-\d+(?:\.\d+)*$/, "") || null;
}

function matchLine(text, pattern) {
  return text.match(pattern)?.[1] || null;
}

function findNextTopLevel(text, start) {
  const match = text.slice(start).match(/^(?:def|template|module)\b/m);
  return match?.index == null ? text.length : start + match.index;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
