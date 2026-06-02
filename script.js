const BUSINESS = {
  phone: "8577057287",
  email: "uniquetuitionbureau888@gmail.com",
  whatsapp: "8577057287",
};

const subjects = {
  primary: {
    label: "Classes 1-5",
    items: ["Mathematics", "English", "Hindi", "EVS", "Computer Basics", "All Subjects"],
  },
  middle: {
    label: "Classes 6-8",
    items: ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer"],
  },
  secondary: {
    label: "Classes 9-10 - All Subjects",
    items: ["Mathematics", "Science", "English", "Hindi", "Social Science", "Computer"],
  },
  science: {
    label: "Classes 11-12 - Science Stream",
    items: ["Physics", "Chemistry", "Mathematics", "Biology", "English", "Computer Science"],
  },
  commerce: {
    label: "Classes 11-12 - Commerce Stream",
    items: ["Accountancy", "Business Studies", "Economics", "Mathematics", "English", "Entrepreneurship"],
  },
  arts: {
    label: "Classes 11-12 - Arts Stream",
    items: ["History", "Geography", "Political Science", "Economics", "Hindi", "English"],
  },
};

const cleanPhone = (value) => {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? `91${digits}` : digits;
};
const phoneNumber = BUSINESS.phone.trim();
const emailAddress = BUSINESS.email.trim();
const whatsappNumber = cleanPhone(BUSINESS.whatsapp || BUSINESS.phone);

document.querySelectorAll(".phone-text").forEach((element) => {
  element.textContent = phoneNumber || "Add phone number";
});

document.querySelectorAll(".email-text").forEach((element) => {
  element.textContent = emailAddress || "Add email address";
});

document.querySelectorAll(".phone-link").forEach((element) => {
  element.href = phoneNumber ? `tel:${phoneNumber}` : "#contact";
});

document.querySelectorAll(".email-link").forEach((element) => {
  element.href = emailAddress ? `mailto:${emailAddress}` : "#contact";
});

document.querySelectorAll(".whatsapp-link").forEach((element) => {
  element.href = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello Union Tuition Bureau, I need a home tutor in Varanasi.")}`
    : "#contact";
  if (whatsappNumber) {
    element.target = "_blank";
    element.rel = "noopener";
  }
});

const renderSubjects = (level) => {
  const selection = subjects[level];
  document.querySelector("#subject-label").textContent = selection.label;
  document.querySelector("#subject-list").innerHTML = selection.items
    .map((subject) => `<span>${subject}</span>`)
    .join("");
};

document.querySelectorAll(".class-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector(".class-tab.active").classList.remove("active");
    tab.classList.add("active");
    renderSubjects(tab.dataset.level);
  });
});

const showForm = (formType) => {
  document.querySelector(".form-switch-button.active").classList.remove("active");
  document.querySelector(".enquiry-form.active").classList.remove("active");
  document.querySelector(`.form-switch-button[data-form="${formType}"]`).classList.add("active");
  document.querySelector(formType === "teacher" ? "#teacher-form" : "#enquiry-form").classList.add("active");
};

document.querySelectorAll(".form-switch-button").forEach((button) => {
  button.addEventListener("click", () => showForm(button.dataset.form));
});

document.querySelectorAll(".form-jump").forEach((button) => {
  button.addEventListener("click", () => showForm(button.dataset.form));
});

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const saveSubmission = async (payload) => {
  const response = await fetch("/api/submissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || "Unable to save your details. Please try again.");
  }
};

document.querySelector("#enquiry-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.querySelector("#form-note");
  const data = Object.fromEntries(new FormData(event.currentTarget));
  note.classList.remove("error");
  note.textContent = "Saving your enquiry...";
  try {
    await saveSubmission({ type: "student", ...data });
  } catch (error) {
    note.textContent = error.message;
    note.classList.add("error");
    return;
  }

  note.textContent = whatsappNumber
    ? "Enquiry saved. Opening WhatsApp for quick follow-up..."
    : "Enquiry saved successfully. We will contact you soon.";
  const message = [
    "Hello Union Tuition Bureau,",
    "I am looking for a home tutor in Varanasi.",
    "",
    `Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Locality: ${data.locality}`,
    `Class: ${data.studentClass}`,
    `Board: ${data.board}`,
    `Subject: ${data.subject}`,
  ].join("\n");

  if (whatsappNumber) window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  event.currentTarget.reset();
});

document.querySelector("#teacher-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const note = document.querySelector("#teacher-form-note");
  const data = Object.fromEntries(new FormData(event.currentTarget));
  note.classList.remove("error");
  note.textContent = "Saving your application...";
  try {
    await saveSubmission({ type: "teacher", ...data });
  } catch (error) {
    note.textContent = error.message;
    note.classList.add("error");
    return;
  }

  note.textContent = whatsappNumber
    ? "Application saved. Opening WhatsApp for quick follow-up..."
    : "Application saved successfully. We will contact you soon.";
  const message = [
    "Hello Union Tuition Bureau,",
    "I would like to apply for home tuition opportunities in Varanasi.",
    "",
    `Teacher Name: ${data.name}`,
    `Phone: ${data.phone}`,
    `Locality: ${data.locality}`,
    `Qualification: ${data.qualification}`,
    `Experience: ${data.experience}`,
    `Classes: ${data.classes}`,
    `Subjects: ${data.subjects}`,
  ].join("\n");

  if (whatsappNumber) window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
  event.currentTarget.reset();
});

document.querySelector("#year").textContent = new Date().getFullYear();
renderSubjects("primary");
