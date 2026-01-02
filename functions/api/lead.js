form && form.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (errorBox) errorBox.style.display = "none";
  if (success) success.style.display = "none";

  submitBtn.disabled = true;
  submitBtn.textContent = "Sending...";

  const data = new FormData(form);

  // 🔥 inject Turnstile token
  const ts = document.querySelector('[name="cf-turnstile-response"]')?.value || "";
  data.set("turnstile", ts);

  try {
    const res = await fetch("/api/lead", {
      method: "POST",
      body: data
    });

    const json = await res.json();

    if (res.ok && json.ok) {
      form.reset();
      form.style.display = "none";
      success.style.display = "block";
    } else {
      errorBox.innerText = json.error || "Server error";
      errorBox.style.display = "block";
    }
  } catch (err) {
    errorBox.innerText = "Network error";
    errorBox.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = submitOriginal;
  }
});
