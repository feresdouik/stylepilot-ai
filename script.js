const $ = (id) => document.getElementById(id);
const imageInput = $("productImage");
const preview = $("imagePreview");
imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  preview.src = URL.createObjectURL(file);
  preview.style.display = "block";
  document.querySelector(".upload-icon").style.display = "none";
  document.querySelector(".upload strong").textContent = file.name;
  document.querySelector(".upload small").textContent = "Photo ready";
});
function sentenceCase(value){return value.trim().replace(/\s+/g," ");}
$("generateBtn").addEventListener("click", () => {
  const name = sentenceCase($("productName").value) || "Your new favourite piece";
  const category = $("category").value;
  const details = sentenceCase($("details").value);
  const tone = $("tone").value;
  const detailLine = details ? details : "Designed for everyday comfort and effortless style.";
  const description = `${name} — a ${category.toLowerCase()} essential made to bring confidence to your everyday look. ${detailLine} Style it your way and make it yours.`;
  const caption = `New energy. Same effortless style. ✳\n\nMeet ${name}. ${detailLine}\n\nYour next outfit starts here. Send us a DM to order.\n\n#Streetwear #NewDrop #StylePilot`;
  const ad = `${name} is here.\n\nUpgrade your rotation with a ${category.toLowerCase()} piece made for your everyday. ${detailLine}\n\nMessage us now to discover your size and order.`;
  $("description").textContent = description;
  $("caption").textContent = caption;
  $("ad").textContent = ad;
  $("emptyState").classList.add("hidden");
  $("results").classList.remove("hidden");
  $("results").scrollIntoView({behavior:"smooth",block:"nearest"});
  $("generateBtn").innerHTML = "Refresh content <span>↗</span>";
});
document.querySelectorAll(".copy-btn").forEach(button => {
  button.addEventListener("click", async () => {
    const target = button.dataset.copy;
    const value = $(target).textContent;
    try {
      await navigator.clipboard.writeText(value);
      button.textContent = "COPIED ✓";
      setTimeout(() => button.textContent = "COPY ↗", 1500);
    } catch {
      button.textContent = "SELECT TO COPY";
    }
  });
});

// Tavily-powered market research (requires the local Flask backend and a private .env key).
const researchBtn = $("researchBtn");
if (researchBtn) {
  researchBtn.addEventListener("click", async () => {
    const query = sentenceCase($("researchQuery").value);
    const status = $("researchStatus");
    const answer = $("researchAnswer");
    const sources = $("researchSources");
    const tools = $("researchTools");
    if (!query) {
      status.textContent = "Enter a research question first.";
      return;
    }
    researchBtn.disabled = true;
    researchBtn.textContent = "Researching...";
    status.textContent = "Searching the web for useful fashion-market information...";
    answer.classList.add("hidden");
    answer.textContent = "";
    sources.replaceChildren();
    tools?.classList.add("hidden");
    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({query})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Research request failed.");
      answer.textContent = data.answer || "Tavily returned sources but no short answer. Explore the links below.";
      answer.classList.remove("hidden");
      tools?.classList.remove("hidden");
      $("copyResearchBtn")?.addEventListener("click", async () => {
        const report = [`STYLEPILOT AI MARKET RESEARCH`, `Query: ${query}`, "", data.answer || "", "", "SOURCES", ...(data.results || []).map((item, index) => `${index + 1}. ${item.title || "Source"} — ${item.url}`)].join("\n");
        try {
          await navigator.clipboard.writeText(report);
          $("copyResearchBtn").textContent = "COPIED ✓";
          setTimeout(() => $("copyResearchBtn").textContent = "COPY FULL REPORT", 1500);
        } catch {
          $("copyResearchBtn").textContent = "COPY UNAVAILABLE";
        }
      }, {once:true});
      if (Array.isArray(data.results) && data.results.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Sources";
        sources.appendChild(heading);
        data.results.forEach((item) => {
          const card = document.createElement("article");
          card.className = "source-card";
          const link = document.createElement("a");
          link.href = item.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = item.title || "Open source";
          const snippet = document.createElement("p");
          snippet.textContent = item.content || "";
          card.append(link, snippet);
          sources.appendChild(card);
        });
      }
      status.textContent = "Research complete · " + (data.results?.length || 0) + " sources found.";
      $("researchSources").scrollIntoView({behavior:"smooth",block:"nearest"});
    } catch (error) {
      status.textContent = error.message + " Check that the local server is running and your Tavily key is set in .env.";
    } finally {
      researchBtn.disabled = false;
      researchBtn.innerHTML = 'Research the market <span>↗</span>';
    }
  });
}


// One-click research angles reuse the same secure backend endpoint.
document.querySelectorAll(".research-chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    $("researchQuery").value = chip.dataset.query;
    $("researchBtn").click();
  });
});
