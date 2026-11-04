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