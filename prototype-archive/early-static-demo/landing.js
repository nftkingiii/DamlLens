const stage = document.querySelector("#mapStage");

if (stage && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 18;
    const y = (event.clientY / window.innerHeight - 0.5) * 14;
    stage.style.setProperty("--mx", `${x}px`);
    stage.style.setProperty("--my", `${y}px`);
  });
}
