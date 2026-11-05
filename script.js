const $ = (id) => document.getElementById(id);
const imageInput = $("productImage");
const preview = $("imagePreview");
let previewObjectUrl = null;
imageInput.addEventListener("change", () => {
  const file = imageInput.files && imageInput.files[0];
  if (!file) return;
  const uploadLabel = document.querySelector(".upload");
  const uploadMessage = document.querySelector(".upload small");
  if (!file.type.startsWith("image/")) {
    imageInput.value = "";
    uploadMessage.textContent = "Please choose an image file.";
    return;
  }
  if (file.size > 10 * 1024 * 1024) {
    imageInput.value = "";
    uploadMessage.textContent = "Image must be 10 MB or smaller.";
    return;
  }
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  previewObjectUrl = URL.createObjectURL(file);
  preview.src = previewObjectUrl;
  preview.style.display = "block";
  document.querySelector(".upload-icon").style.display = "none";
  document.querySelector(".upload strong").textContent = file.name;
  uploadMessage.textContent = "Photo ready · preview only, not uploaded";
  uploadLabel.setAttribute("aria-label", "Selected product image: " + file.name);
});
function sentenceCase(value){return value.trim().replace(/\s+/g," ");}
function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function classifyFashionSource(item, researchQuery = ""){
  const url = item.url || "";
  const title = item.title || "";
  const content = item.content || "";
  const text = [title, content].join(" ");
  let hostname = "";
  let pathname = "";
  let parsedUrl = null;
  let hasIndividualAdId = false;
  let hasPageAdId = false;
  try {
    parsedUrl = new URL(url);
    hostname = parsedUrl.hostname.toLowerCase();
    pathname = parsedUrl.pathname.toLowerCase();
    hasIndividualAdId = parsedUrl.searchParams.has("id");
    hasPageAdId = parsedUrl.searchParams.has("view_all_page_id");
  } catch {}

  const isFacebook = hostname === "facebook.com" || hostname.endsWith(".facebook.com");
  const isMetaAdsLibrary = isFacebook && /\/ads\/library\/?/.test(pathname);
  const isIndividualMetaAd = isMetaAdsLibrary && hasIndividualAdId;
  const isPageAdsArchive = isMetaAdsLibrary && hasPageAdId;
  const socialPlatform = /(^|\.)(facebook|instagram|tiktok|pinterest)\.com$/.test(hostname);
  const isLocalDomain = hostname.endsWith(".tn");

  // Search/hashtag/reel-discovery pages aggregate unrelated posts and are not individual sellers.
  const aggregatePath = /\/(popular|explore|hashtag|hashtags|search|directory)(\/|$)/i.test(pathname);
  const aggregateTitle = /\b(?:\d{2,}|900)\+?\s*reels?\b|\bon reels\b|\bpopular (?:on )?instagram\b|\binstagram popular\b/i.test(title);
  const marketplaceDomain = /(^|\.)((aliexpress|ubuy|goxip))\./i.test(hostname);
  if (marketplaceDomain || (socialPlatform && (aggregatePath || aggregateTitle))) return "Irrelevant";

  const localMention = /\b(Tunisia|Tunisian|Tunisie|Tunisien(ne)?s?|en Tunisie|livraison partout en Tunisie|Tunis|Sousse|Sfax|Monastir|Nabeul|Bizerte|Kairouan|Ariana|Ben Arous)\b|\+216|\bTND\b|تونس|تونسي/i.test(text);
  const localEvidence = isLocalDomain || localMention;

  const kidsQuery = /\b(kids?|children|childrenswear|children's clothing|baby|babies|toddler|infant|boys|girls|enfants?|bébé|bebe)\b/i.test(researchQuery);
  const kidsTerms = /\b(kids?|children|childrenswear|children's clothing|baby|babies|toddler|infant|boys|girls|enfant|enfants|bébé|bebe|fille|filles|garçon|garcons|ensemble(s)? enfants?|vêtements pour enfants|vetements pour enfants|vêtements enfants|vetements enfants|tenue enfant|survêtement enfant|survetement enfant|babywear)\b/i;
  const kidsProductMatch = kidsTerms.test(text) || kidsTerms.test(pathname.replace(/[-_/]+/g, " "));

  const streetwearQuery = /\b(streetwear|street wear|urban wear|men'?s|menswear|homme|unisex)\b/i.test(researchQuery);
  const streetwearTerms = /\b(streetwear|street wear|urban wear|men|menswear|homme|hommes|unisex|baggy|cargo|oversized|boxy|hoodie|sweatshirt|tracksuit|jogger|jeans|t-?shirts?|tees|pantalon|survêtement|survetement|sweat|veste|short|mode homme|vêtements homme|vetements homme)\b/i;
  const categoryMatch = kidsQuery ? kidsProductMatch : (!streetwearQuery || streetwearTerms.test(text));

  const fashionSignal = /\b(clothing|apparel|fashion|garment|outfit|streetwear|hoodie|sweatshirt|tracksuit|jeans|t-?shirt|tee|boutique|brand|ready-to-wear|prêt-à-porter|vêtement|vetement|ensemble|robe|pyjama|jogging|survêtement|survetement|tenue|ملابس|لباس)\b/i.test(text);
  const productSignal = /\b(hoodie|sweatshirt|tracksuit|jogger|jeans?|cargo|pants?|trousers?|shorts?|t-?shirts?|tees|polo|shirt|sweater|jumper|jacket|coat|dress|robe|skirt|pyjama|pajama|leggings|survêtement|survetement|pantalon|veste|pull|sweat|ensemble|outfit|clothing|apparel|garment|vêtements|vetements|ملابس|لباس)\b/i.test(text);
  const hasRelevantProduct = fashionSignal && productSignal && categoryMatch;

  const editorialSignal = /\b(brand(s)? worth knowing|must[- ]know|where to shop|guide to|fashion brands|clothing brands|shopping guide|top brands|best brands|directory|blog|editorial|store locator|our stores|find a store|stores in tunisia|store locations|magasins en tunisie)\b/i.test(title + " " + pathname + " " + content.slice(0, 1400));
  const storeLocatorOnly = /\b(store locator|our stores|find a store|stores in tunisia|store locations|magasins en tunisie|visit our store|visit our stores)\b/i.test(title + " " + pathname + " " + content.slice(0, 1400));
  if (editorialSignal || storeLocatorOnly) return "Irrelevant";
  if (!hasRelevantProduct) {
    if (localEvidence && fashionSignal && !kidsQuery) return "Local Fashion Brand";
    return "Irrelevant";
  }

  const commerceSignal = /\b(shop|shop now|online store|online shop|add to cart|product listing|buy now|buy online|order online|price|prices|prix|livraison|delivery|collection|catalogue|catalog|available|disponible|commander|commande|whatsapp|messenger|instagram dm|send a message|inbox|cash on delivery|paiement à la livraison|payment on delivery)\b/i.test(text);
  const explicitOrderSignal = /\b(order now|order online|place an order|for orders|to order|order via|order by|dm to order|message to order|commander maintenant|pour commander|commandez|commande par dm|commander par dm|dm pour commander|commande via whatsapp|order via whatsapp|send us a message|message us to order|اطلب الآن|اطلب عبر|للطلب|تأكيد الطلب)\b/i.test(text);
  const verifiedOrderEvidence = commerceSignal && explicitOrderSignal;
  const conflictingForeignContact = /\+20\d{8,}/.test(text) && !/\+216/.test(text) && !isLocalDomain;

  // An individual ad needs its own ID and matching local product evidence.
  if (isIndividualMetaAd && localEvidence && hasRelevantProduct) return "Verified Meta Ad";

  // A page archive is not an individual ad; it can only support seller status with explicit order evidence.
  const validSellerSource = socialPlatform || isPageAdsArchive || isLocalDomain;
  if (localEvidence && hasRelevantProduct && verifiedOrderEvidence && validSellerSource && !conflictingForeignContact) {
    return "Verified Online Seller";
  }

  if (localEvidence && hasRelevantProduct && socialPlatform) return "Potential Competitor";
  if (localEvidence && hasRelevantProduct && (isLocalDomain || isPageAdsArchive)) return "Local competitor";
  if (localEvidence && fashionSignal) return "Local Fashion Brand";
  return "Global Inspiration";
}
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

const copyResearchBtn = $("copyResearchBtn");
if (copyResearchBtn) {
  copyResearchBtn.addEventListener("click", async () => {
    if (!latestResearchData) return;
    const data = latestResearchData;
    const report = [
      "STYLEPILOT AI MARKET RESEARCH",
      "Query: " + (data.query || ""),
      "",
      "EVIDENCE SUMMARY",
      $("researchAnswer")?.textContent || "No evidence summary available.",
      "",
      "SOURCES",
      ...(Array.isArray(data.results) ? data.results.filter(item => classifyFashionSource(item, data.query || "") !== "Irrelevant") : []).map((item, index) =>
        (index + 1) + ". " + (item.title || "Source") + " — " + (item.url || "")
      )
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      copyResearchBtn.textContent = "COPIED ✓";
      setTimeout(() => copyResearchBtn.textContent = "COPY FULL REPORT", 1500);
    } catch {
      copyResearchBtn.textContent = "COPY UNAVAILABLE";
    }
  });
}
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
    if (copyResearchBtn) copyResearchBtn.disabled = true;
    latestResearchData = null;
    latestPlanSources = [];
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
      if (copyResearchBtn) copyResearchBtn.disabled = false;
      $("marketingPlan")?.classList.add("hidden");
      if ($("copyMarketingPlanBtn")) $("copyMarketingPlanBtn").disabled = true;
      $("marketingPlan")?.replaceChildren();
      const sourceItems = Array.isArray(data.results) ? data.results : [];
      const verifiedSourceItems = sourceItems.filter(item => classifyFashionSource(item, query) !== "Irrelevant");
      const verifiedOnlineSellers = sourceItems.filter(item => classifyFashionSource(item, query) === "Verified Online Seller");
      const metaAdSources = sourceItems.filter(item => classifyFashionSource(item, query) === "Verified Meta Ad");
      const potentialLocalCompetitors = sourceItems.filter(item => classifyFashionSource(item, query) === "Potential Competitor");
      const evidenceWarning = verifiedSourceItems.length
        ? "Evidence note: Meta Ads Library links are counted separately from sellers. A commercial social post is not automatically a paid ad. Verify each seller\u2019s current products, prices and delivery manually. "
        : "Evidence warning: none of the returned sources passed the relevance checks. No reliable Tunisia trend or competitor finding can be made from these results. Try a narrower search. ";
      const categoryCounts = sourceItems.reduce((counts, item) => {
        const label = classifyFashionSource(item, query);
        counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {});
      const evidenceSummary = [
        "Search completed: " + sourceItems.length + " unique pages returned across " + (data.search_lanes || 1) + " targeted searches (" + (data.successful_lanes || 1) + " successful).",
        "Verified Meta Ads Library ads: " + (categoryCounts["Verified Meta Ad"] || 0) + ".",
        "Verified local online sellers: " + (categoryCounts["Verified Online Seller"] || 0) + ".",
        "Potential local competitors (sales not verified): " + (categoryCounts["Potential Competitor"] || 0) + ".",
        "Other local fashion references: " + ((categoryCounts["Local competitor"] || 0) + (categoryCounts["Local Fashion Brand"] || 0)) + ".",
        "International inspiration: " + (categoryCounts["Global Inspiration"] || 0) + ".",
        "Irrelevant pages: " + (categoryCounts["Irrelevant"] || 0) + "."
      ].join(" ");
      answer.textContent = evidenceWarning + evidenceSummary + " Open the classified source links below. StylePilot does not present Tavily's unverified generated summary as a Tunisia market finding.";
      answer.classList.remove("hidden");
      tools?.classList.remove("hidden");
      if (verifiedSourceItems.length) {
        const heading = document.createElement("h3");
        heading.textContent = "Relevant sources";
        sources.appendChild(heading);
        verifiedSourceItems.forEach((item) => {
          const card = document.createElement("article");
          card.className = "source-card";
          const sourceUrl = safeHttpUrl(item.url);
          const sourceTitle = item.title || "Untitled source";
          const sourceHeading = document.createElement(sourceUrl ? "a" : "strong");
          sourceHeading.textContent = sourceTitle;
          if (sourceUrl) {
            sourceHeading.href = sourceUrl;
            sourceHeading.target = "_blank";
            sourceHeading.rel = "noopener noreferrer";
          }
          const classification = document.createElement("small");
          classification.className = "source-classification";
          classification.textContent = classifyFashionSource(item, latestResearchData?.query || "");
          const snippet = document.createElement("p");
          snippet.textContent = item.content || "";
          card.append(sourceHeading, classification, snippet);
          sources.appendChild(card);
        });
      }
      status.textContent = "Research complete · " + verifiedSourceItems.length + " relevant sources from " + (data.results?.length || 0) + " results.";
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
    const relevantResults = results.filter(item => classifyFashionSource(item, latestResearchData.query || "") !== "Irrelevant");
    latestPlanSources = relevantResults;
    const directOnlineSellers = relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Verified Online Seller");
    const potentialCompetitors = relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Potential Competitor");
    const localCompetitors = relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Local competitor");
    const localBrands = relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Local Fashion Brand");
    const globalSources = relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Global Inspiration");
    const localSources = [...directOnlineSellers, ...potentialCompetitors, ...localCompetitors, ...localBrands];
    const internationalSources = globalSources;
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
    note.textContent = "Relevant sources: " + relevantResults.length + " of " + results.length + ". Verified Meta Ads Library ads: " + relevantResults.filter(item => classifyFashionSource(item, latestResearchData.query || "") === "Verified Meta Ad").length + ". Verified online sellers: " + directOnlineSellers.length + ". Potential competitors (sales not verified): " + potentialCompetitors.length + ". Other local competitors: " + localCompetitors.length + ". Tunisian fashion brands: " + localBrands.length + ". Global inspiration: " + globalSources.length + ". " + (directOnlineSellers.length ? "Local online clothing sellers found. Check each source for comparable products and current prices." : "No direct online local clothing competitor was verified by the available snippets. Potential references are not counted as confirmed sellers.") + " A Tunisia mention or a broad category alone is not proof of a matching product listing or local sales demand. Signals: " + observed + ". Search results are not proof of sales demand.";
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
    sourceLine.textContent = "VERIFIED ONLINE CLOTHING SELLERS: " + (directOnlineSellers.map(item => item.title || "Source").join(" / ") || "None identified") + " | POTENTIAL LOCAL CLOTHING COMPETITORS: " + (potentialCompetitors.map(item => item.title || "Source").join(" / ") || "None identified") + " | OTHER LOCAL COMPETITORS: " + (localCompetitors.map(item => item.title || "Source").join(" / ") || "None identified") + " | TUNISIAN FASHION BRANDS: " + (localBrands.map(item => item.title || "Source").join(" / ") || "None identified") + " | GLOBAL INSPIRATION: " + (globalSources.map(item => item.title || "Source").join(" / ") || "None identified");
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
