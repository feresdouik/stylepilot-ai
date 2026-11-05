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
  const voice = {
    "Confident and modern": {lead:"Built for your everyday rotation.",caption:"New energy. No compromise.",cta:"Make it yours. Send us a DM to order."},
    "Premium and minimal": {lead:"Considered style. Everyday comfort.",caption:"Less noise. Better essentials.",cta:"Discover the details. Message us to order."},
    "Friendly and casual": {lead:"An easy favourite for everyday wear.",caption:"Your next go-to piece is here.",cta:"Like the look? Send us a DM and we'll help you order."},
    "Bold and energetic": {lead:"Stand out. Own your look.",caption:"Fresh drop. Big energy. ✳",cta:"Get yours now. Message us to order."}
  }[tone] || {lead:"Built for your everyday rotation.",caption:"New energy. Same effortless style. ✳",cta:"Send us a DM to order."};
  const description = `${name} — a ${category.toLowerCase()} essential. ${voice.lead} ${detailLine} Style it your way and make it yours.`;
  const caption = `${voice.caption}\n\nMeet ${name}. ${detailLine}\n\n${voice.cta}\n\n#Streetwear #NewDrop #StylePilot`;
  const ad = `${name} is here.\n\n${voice.lead} ${detailLine}\n\n${voice.cta}`;
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
let latestResearchData = null;
let latestPlanSources = [];
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
      latestResearchData = data;
      $("marketingPlan")?.classList.add("hidden");
      if ($("copyMarketingPlanBtn")) $("copyMarketingPlanBtn").disabled = true;
      $("marketingPlan")?.replaceChildren();
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


// Build a plan only from sources that contain real fashion / apparel evidence.
const buildPlanBtn = $("buildMarketingPlanBtn");
if (buildPlanBtn) {
  buildPlanBtn.addEventListener("click", () => {
    const panel = $("marketingPlan");
    if (!latestResearchData || !panel) return;
    const results = Array.isArray(latestResearchData.results) ? latestResearchData.results : [];
    const fashionTerms = /\b(clothing|apparel|fashion|garment|outfit|kidswear|childrenswear|streetwear|t-shirt|tshirt|hoodie|sweatshirt|tracksuit|jeans|clothing set|kids clothing|children clothing|kids' clothing|boutique)\b/i;
    const relevantResults = results.filter(item => {
      const sourceText = [item.title || "", item.content || "", item.url || ""].join(" ");
      return fashionTerms.test(sourceText);
    });
    latestPlanSources = relevantResults;
    const localSources = relevantResults.filter(item => {
      const url = item.url || "";
      const text = [item.title || "", item.content || ""].join(" ");
      let isTnDomain = false;
      try { isTnDomain = new URL(url).hostname.toLowerCase().endsWith(".tn"); } catch {}
      const mentionsTunisia = /\\b(Tunisia|Tunisian|Tunis|Sousse|Sfax|Monastir|Nabeul|Bizerte|Kairouan|Ariana)\\b/i.test(text);
      const hasLocalCommerceSignal = /\\b(TND|DT|dinar|dinars|livraison|delivery|shop now|add to cart|price|prix|boutique|store)\\b/i.test(text);
      return isTnDomain || (mentionsTunisia && hasLocalCommerceSignal);
    });
    const internationalSources = relevantResults.filter(item => !localSources.includes(item));
    const query = (latestResearchData.query || "").toLowerCase();
    const evidence = [latestResearchData.answer || "", ...relevantResults.map(item => item.content || "")].join(" ").toLowerCase();
    const signals = [
      ["oversized / boxy fit", /oversiz|boxy|relaxed fit/.test(evidence)],
      ["baggy / wide-leg bottoms", /baggy|wide[- ]leg|jorts|cargo pants/.test(evidence)],
      ["graphic / racing details", /graphic print|graphic tee|racing|motorsport/.test(evidence)],
      ["minimal / neutral styling", /minimal|neutral palette|monochrome/.test(evidence)],
      ["heavyweight fabrics", /heavyweight|heavy weight|fleece|\b\d{2,3} gsm\b|thick cotton/.test(evidence)],
      ["matching sets", /matching set|co-ord|coordinated set|two-piece set/.test(evidence)]
    ].filter(item => item[1]).map(item => item[0]);

    panel.replaceChildren();
    if (relevantResults.length < 2) {
      const heading = document.createElement("h3");
      heading.textContent = "Not enough relevant fashion evidence";
      const message = document.createElement("p");
      message.className = "plan-note";
      message.textContent = "The search returned fewer than two sources that clearly discuss clothing or fashion. StylePilot will not invent trend signals or build a marketing plan from unrelated education, startup or travel pages. Try a more specific query such as: \"" + (query.includes("kid") ? "kids clothing sets trends Tunisia retailers" : "men's streetwear clothing trends Tunisia retailers") + "\".";
      panel.append(heading, message);
      panel.classList.remove("hidden");
      if ($("copyMarketingPlanBtn")) $("copyMarketingPlanBtn").disabled = true;
      panel.scrollIntoView({behavior:"smooth", block:"nearest"});
      return;
    }

    const observed = signals.length ? signals.slice(0, 3).join(", ") : "fashion topics covered by the relevant sources";
    const cards = [
      {
        title: "01 · Product test",
        body: signals.length
          ? "Test one small-batch product built around this research signal: " + observed + ". Check local competitors, sizes and price points before ordering stock."
          : "Choose one product category explicitly discussed by the relevant fashion sources. Validate local price, sizes and demand with a sample or pre-orders before buying stock.",
        action: "Measure confirmed orders and gross margin, not likes or messages."
      },
      {
        title: "02 · Content test",
        body: "Create a 10–15 second Reel showing the actual product, fit, fabric and details. Use only a feature confirmed by the relevant sources as the opening hook.",
        action: "Test two hooks for the same product and compare saves, profile visits and serious enquiries."
      },
      {
        title: "03 · Ad test",
        body: "Test two creatives for the same product: one focused on its practical benefit and one showing a complete outfit. Display the real price, available sizes, delivery and cash-on-delivery terms.",
        action: "Track cost per confirmed order and profit after product and delivery costs. Do not scale based on message volume alone."
      }
    ];
    const heading = document.createElement("h3");
    heading.textContent = "Your research-led marketing plan";
    panel.appendChild(heading);
    const note = document.createElement("p");
    note.className = "plan-note";
    note.textContent = "Relevant fashion sources: " + relevantResults.length + " of " + results.length + ". Potential Tunisian retail/market sources: " + localSources.length + ". International fashion sources: " + internationalSources.length + ". " + (localSources.length ? "Local signals detected. Check each source: a Tunisia mention alone is not proof of local retail demand." : "No clear Tunisia-specific retail evidence found. These are international fashion signals only; do not treat them as proof of Tunisian demand.") + " Signals: " + observed + ". Search results are not proof of sales demand.";
    panel.appendChild(note);
    const grid = document.createElement("div");
    grid.className = "marketing-plan-grid";
    cards.forEach(item => {
      const card = document.createElement("article");
      card.className = "marketing-plan-card";
      const title = document.createElement("h4");
      title.textContent = item.title;
      const body = document.createElement("p");
      body.textContent = item.body;
      const action = document.createElement("strong");
      action.textContent = item.action;
      card.append(title, body, action);
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    const sourceLine = document.createElement("p");
    sourceLine.className = "plan-sources";
    sourceLine.textContent = "Fashion sources: " + relevantResults.slice(0, 5).map(item => item.title || "Source").join(" / ") + (localSources.length ? " | Tunisia-related: " + localSources.map(item => item.title || "Source").join(" / ") : " | No clearly local Tunisian retail source detected.");
    panel.appendChild(sourceLine);
    panel.classList.remove("hidden");
    if ($("copyMarketingPlanBtn")) $("copyMarketingPlanBtn").disabled = false;
    panel.scrollIntoView({behavior:"smooth", block:"nearest"});
  });
}


// Copy the generated plan together with the exact source URLs used by the research.
const copyPlanBtn = $("copyMarketingPlanBtn");
if (copyPlanBtn) {
  copyPlanBtn.addEventListener("click", async () => {
    if (!latestResearchData) return;
    const planText = $("marketingPlan")?.innerText || "";
    if (!planText) return;
    const sourceText = latestPlanSources.map((item, index) =>
      `${index + 1}. ${item.title || "Source"} — ${item.url || ""}`
    ).join("\n");
    const fullText = `STYLEPILOT AI — MARKETING PLAN\nResearch: ${latestResearchData.query || ""}\n\n${planText}\n\nSOURCE LINKS\n${sourceText}`;
    try {
      await navigator.clipboard.writeText(fullText);
      copyPlanBtn.textContent = "COPIED ✓";
      setTimeout(() => copyPlanBtn.textContent = "COPY PLAN", 1500);
    } catch {
      copyPlanBtn.textContent = "COPY UNAVAILABLE";
    }
  });
}
