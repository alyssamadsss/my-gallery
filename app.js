const SUPABASE_URL =
  "https://jaubryfyktdfzxqbrzue.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qNcbkgifCJVk0cX7A7oRXg_AtlSlAld";

const ADMIN_UID =
  "dabf4e39-9760-4041-be58-b6a6c42e0351";

const BUCKET_NAME = "gallery";

const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );

let currentUser = null;
let isAdmin = false;

let sections = [];
let memories = [];

let currentSection = null;
let currentSort = "newest";


const gallery =
  document.getElementById("gallery");

const emptyState =
  document.getElementById("emptyState");

const navigation =
  document.getElementById("navigation");

const adminControls =
  document.getElementById("adminControls");

const adminButton =
  document.getElementById("adminButton");

const addMemoryButton =
  document.getElementById("addMemoryButton");

const newSectionButton =
  document.getElementById("newSectionButton");

const logoutButton =
  document.getElementById("logoutButton");

const sortSelect =
  document.getElementById("sortSelect");

const loginModal =
  document.getElementById("loginModal");

const memoryModal =
  document.getElementById("memoryModal");

const sectionModal =
  document.getElementById("sectionModal");

const lightbox =
  document.getElementById("lightbox");

const lightboxContent =
  document.getElementById("lightboxContent");

const toast =
  document.getElementById("toast");


document.addEventListener(
  "DOMContentLoaded",
  initialize
);


async function initialize() {

  setupEventListeners();

  await checkSession();

  await loadSections();

  await loadMemories();

  renderNavigation();

  renderGallery();

}


function setupEventListeners() {

  adminButton.addEventListener(
    "click",
    () => {

      if (isAdmin) {
        showToast(
          "you're already logged in ♡"
        );
      } else {
        openModal(loginModal);
      }

    }
  );


  addMemoryButton.addEventListener(
    "click",
    () => {

      if (!isAdmin) return;

      populateSectionSelect();

      openModal(memoryModal);

    }
  );


  newSectionButton.addEventListener(
    "click",
    () => {

      if (!isAdmin) return;

      openModal(sectionModal);

    }
  );


  logoutButton.addEventListener(
    "click",
    logout
  );


  sortSelect.addEventListener(
    "change",
    event => {

      currentSort =
        event.target.value;

      renderGallery();

    }
  );


  document
    .getElementById("loginForm")
    .addEventListener(
      "submit",
      handleLogin
    );


  document
    .getElementById("memoryForm")
    .addEventListener(
      "submit",
      handleAddMemory
    );


  document
    .getElementById("sectionForm")
    .addEventListener(
      "submit",
      handleCreateSection
    );


  document
    .querySelectorAll("[data-close]")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          closeModal(
            document.getElementById(
              button.dataset.close
            )
          );

        }
      );

    });


  document
    .querySelectorAll(".modal-backdrop")
    .forEach(backdrop => {

      backdrop.addEventListener(
        "click",
        () => {

          closeModal(
            backdrop.parentElement
          );

        }
      );

    });


  document
    .getElementById("lightboxClose")
    .addEventListener(
      "click",
      closeLightbox
    );


  lightbox.addEventListener(
    "click",
    event => {

      if (
        event.target === lightbox
      ) {

        closeLightbox();

      }

    }
  );


  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape"
      ) {

        closeLightbox();

        document
          .querySelectorAll(".modal")
          .forEach(closeModal);

      }

    }
  );


  supabaseClient.auth.onAuthStateChange(
    async (_event, session) => {

      await processSession(
        session
      );

    }
  );

}


/* ============================================================
   AUTH
   ============================================================ */

async function checkSession() {

  const {
    data,
    error
  } =
    await supabaseClient.auth.getSession();


  if (error) {

    console.error(error);

    showToast(
      "couldn't check your login"
    );

    return;

  }


  await processSession(
    data.session
  );

}


async function processSession(session) {

  currentUser =
    session?.user || null;


  if (!currentUser) {

    isAdmin = false;

    updateAdminUI();

    return;

  }


  if (
    currentUser.id !== ADMIN_UID
  ) {

    isAdmin = false;

    updateAdminUI();

    await supabaseClient.auth.signOut();

    showToast(
      "that account isn't the gallery admin ♡"
    );

    return;

  }


  isAdmin = true;

  updateAdminUI();

}


function updateAdminUI() {

  if (isAdmin) {

    adminControls.classList.remove(
      "hidden"
    );

  } else {

    adminControls.classList.add(
      "hidden"
    );

  }

}


/* ============================================================
   LOGIN
   ============================================================ */

async function handleLogin(event) {

  event.preventDefault();


  const email =
    document
      .getElementById("loginEmail")
      .value
      .trim();


  const password =
    document
      .getElementById("loginPassword")
      .value;


  const errorElement =
    document.getElementById(
      "loginError"
    );


  errorElement.textContent = "";


  const button =
    event.target.querySelector(
      "button[type='submit']"
    );


  button.disabled = true;

  button.textContent =
    "logging in...";


  const {
    data,
    error
  } =
    await supabaseClient.auth
      .signInWithPassword({
        email,
        password
      });


  button.disabled = false;

  button.textContent =
    "log in ♡";


  if (error) {

    errorElement.textContent =
      "That email or password didn't work.";

    return;

  }


  if (
    data.user.id !== ADMIN_UID
  ) {

    await supabaseClient.auth.signOut();

    errorElement.textContent =
      "This account isn't authorized as the gallery admin.";

    return;

  }


  closeModal(loginModal);

  document
    .getElementById("loginForm")
    .reset();


  showToast(
    "welcome back ♡"
  );

}


async function logout() {

  await supabaseClient.auth.signOut();

  showToast(
    "logged out ♡"
  );

}


/* ============================================================
   SECTIONS
   ============================================================ */

async function loadSections() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("sections")
      .select("*")
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(error);

    showToast(
      "couldn't load sections"
    );

    return;

  }


  sections =
    data || [];

}


function renderNavigation() {

  navigation.innerHTML = "";


  const allButton =
    document.createElement("button");


  allButton.className =
    "nav-item";


  if (
    currentSection === null
  ) {

    allButton.classList.add(
      "active"
    );

  }


  allButton.textContent =
    "all memories ♡";


  allButton.addEventListener(
    "click",
    () => {

      currentSection = null;

      renderNavigation();

      renderGallery();

    }
  );


  navigation.appendChild(
    allButton
  );


  sections.forEach(
    section => {

      const wrapper =
        document.createElement("div");


      wrapper.className =
        "section-nav-item";


      const button =
        document.createElement("button");


      button.className =
        "nav-item";


      if (
        currentSection === section.id
      ) {

        button.classList.add(
          "active"
        );

      }


      button.textContent =
        section.title;


      button.addEventListener(
        "click",
        () => {

          currentSection =
            section.id;

          renderNavigation();

          renderGallery();

        }
      );


      wrapper.appendChild(
        button
      );


      if (isAdmin) {

        const removeButton =
          document.createElement(
            "button"
          );


        removeButton.className =
          "remove-section";


        removeButton.textContent =
          "×";


        removeButton.title =
          "Remove section";


        removeButton.addEventListener(
          "click",
          event => {

            event.stopPropagation();

            removeSection(
              section
            );

          }
        );


        wrapper.appendChild(
          removeButton
        );

      }


      navigation.appendChild(
        wrapper
      );

    }
  );

}


/* ============================================================
   CREATE SECTION
   ============================================================ */

async function handleCreateSection(
  event
) {

  event.preventDefault();


  if (!isAdmin) return;


  const title =
    document
      .getElementById("sectionTitle")
      .value
      .trim();


  const subtitle =
    document
      .getElementById("sectionSubtitle")
      .value
      .trim();


  const errorElement =
    document.getElementById(
      "sectionError"
    );


  errorElement.textContent = "";


  if (!title) {

    errorElement.textContent =
      "Please give your section a name.";

    return;

  }


  if (
    title.toLowerCase() ===
    "all memories ♡"
  ) {

    errorElement.textContent =
      '"all memories ♡" is reserved for the main gallery.';

    return;

  }


  const duplicate =
    sections.some(
      section =>
        section.title
          .trim()
          .toLowerCase() ===
        title.toLowerCase()
    );


  if (duplicate) {

    errorElement.textContent =
      "You already have a section with that name.";

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .from("sections")
      .insert({
        title,
        subtitle:
          subtitle || null
      });


  if (error) {

    console.error(error);

    errorElement.textContent =
      "Couldn't create that section.";

    return;

  }


  closeModal(sectionModal);

  document
    .getElementById("sectionForm")
    .reset();


  await loadSections();

  renderNavigation();


  showToast(
    "new section created ♡"
  );

}


/* ============================================================
   REMOVE SECTION
   ============================================================ */

async function removeSection(
  section
) {

  if (!isAdmin) return;


  const confirmed =
    confirm(
      `Remove "${section.title}"?\n\n` +
      `The memories inside this section will NOT be deleted. ` +
      `They will be moved to All Memories.`
    );


  if (!confirmed) return;


  /*
    Setting section_id to NULL first means
    the memories survive when the section
    is removed.
  */

  const {
    error: updateError
  } =
    await supabaseClient
      .from("memories")
      .update({
        section_id: null
      })
      .eq(
        "section_id",
        section.id
      );


  if (updateError) {

    console.error(updateError);

    showToast(
      "couldn't move the memories"
    );

    return;

  }


  const {
    error: deleteError
  } =
    await supabaseClient
      .from("sections")
      .delete()
      .eq(
        "id",
        section.id
      );


  if (deleteError) {

    console.error(deleteError);

    showToast(
      "couldn't remove that section"
    );

    return;

  }


  if (
    currentSection === section.id
  ) {

    currentSection = null;

  }


  await loadSections();

  await loadMemories();

  renderNavigation();

  renderGallery();


  showToast(
    "section removed ♡"
  );

}


/* ============================================================
   MEMORIES
   ============================================================ */

async function loadMemories() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("memories")
      .select("*");


  if (error) {

    console.error(error);

    showToast(
      "couldn't load memories"
    );

    return;

  }


  memories =
    data || [];

}


/* ============================================================
   SORTING
   ============================================================ */

function sortMemories(items) {

  return [...items].sort(
    (a, b) => {

      if (
        currentSort === "recent"
      ) {

        return compareDateTime(
          b.created_at,
          a.created_at
        );

      }


      /*
        Memories with dates always come
        before memories without dates.
      */

      if (
        !a.date &&
        !b.date
      ) {

        return compareDateTime(
          b.created_at,
          a.created_at
        );

      }


      if (!a.date) return 1;

      if (!b.date) return -1;


      /*
        YYYY-MM-DD strings can be safely
        compared directly. This avoids
        timezone problems.
      */

      const comparison =
        a.date.localeCompare(
          b.date
        );


      if (
        currentSort === "oldest"
      ) {

        return comparison;

      }


      return -comparison;

    }
  );

}


function compareDateTime(a, b) {

  return (
    new Date(a).getTime() -
    new Date(b).getTime()
  );

}


/* ============================================================
   GALLERY
   ============================================================ */

function renderGallery() {

  gallery.innerHTML = "";


  let visibleMemories =
    memories;


  if (
    currentSection !== null
  ) {

    visibleMemories =
      memories.filter(
        memory =>
          memory.section_id ===
          currentSection
      );

  }


  visibleMemories =
    sortMemories(
      visibleMemories
    );


  if (
    visibleMemories.length === 0
  ) {

    emptyState.classList.remove(
      "hidden"
    );

    return;

  }


  emptyState.classList.add(
    "hidden"
  );


  visibleMemories.forEach(
    memory => {

      gallery.appendChild(
        createMemoryCard(
          memory
        )
      );

    }
  );

}


/* ============================================================
   MEMORY CARD
   ============================================================ */

function createMemoryCard(
  memory
) {

  const card =
    document.createElement(
      "article"
    );


  card.className =
    "memory-card";


  const publicUrl =
    getPublicUrl(
      memory.file_path
    );


  let media;


  if (
    memory.type === "video"
  ) {

    media =
      document.createElement(
        "video"
      );


    media.className =
      "memory-media memory-video";


    media.controls = true;

    media.preload =
      "metadata";

    media.playsInline =
      true;

    media.src =
      publicUrl;


    media.addEventListener(
      "dblclick",
      () => {

        openLightbox(
          publicUrl,
          "video"
        );

      }
    );

  } else {

    media =
      document.createElement(
        "img"
      );


    media.className =
      "memory-media";


    media.loading =
      "lazy";


    media.alt =
      memory.caption ||
      "A little memory";


    media.src =
      publicUrl;


    media.addEventListener(
      "click",
      () => {

        openLightbox(
          publicUrl,
          "image"
        );

      }
    );

  }


  media.addEventListener(
    "error",
    () => {

      media.style.display =
        "none";

    }
  );


  card.appendChild(
    media
  );


  const details =
    document.createElement(
      "div"
    );


  details.className =
    "memory-details";


  if (memory.date) {

    const date =
      document.createElement(
        "div"
      );


    date.className =
      "memory-date";


    date.textContent =
      formatDate(
        memory.date
      );


    details.appendChild(
      date
    );

  }


  if (
    memory.location
  ) {

    const location =
      document.createElement(
        "div"
      );


    location.className =
      "memory-location";


    location.textContent =
      `📍 ${memory.location}`;


    details.appendChild(
      location
    );

  }


  if (
    memory.caption &&
    memory.caption.trim()
  ) {

    const caption =
      document.createElement(
        "div"
      );


    caption.className =
      "memory-caption";


    caption.textContent =
      memory.caption;


    details.appendChild(
      caption
    );

  }


  if (isAdmin) {

    const admin =
      document.createElement(
        "div"
      );


    admin.className =
      "memory-admin";


    const deleteButton =
      document.createElement(
        "button"
      );


    deleteButton.className =
      "delete-memory";


    deleteButton.textContent =
      "delete";


    deleteButton.addEventListener(
      "click",
      () => {

        deleteMemory(
          memory
        );

      }
    );


    admin.appendChild(
      deleteButton
    );


    details.appendChild(
      admin
    );

  }


  card.appendChild(
    details
  );


  return card;

}


/* ============================================================
   ADD MEMORY
   ============================================================ */

async function handleAddMemory(
  event
) {

  event.preventDefault();


  if (!isAdmin) return;


  const fileInput =
    document.getElementById(
      "memoryFile"
    );


  const file =
    fileInput.files[0];


  const sectionId =
    document.getElementById(
      "memorySection"
    ).value;


  const date =
    document.getElementById(
      "memoryDate"
    ).value;


  const location =
    document.getElementById(
      "memoryLocation"
    ).value.trim();


  const caption =
    document.getElementById(
      "memoryCaption"
    ).value.trim();


  const errorElement =
    document.getElementById(
      "memoryError"
    );


  const progress =
    document.getElementById(
      "uploadProgress"
    );


  const saveButton =
    document.getElementById(
      "saveMemoryButton"
    );


  errorElement.textContent = "";


  if (!file) {

    errorElement.textContent =
      "Please choose a photo or video.";

    return;

  }


  const isImage =
    file.type.startsWith(
      "image/"
    );


  const isVideo =
    file.type.startsWith(
      "video/"
    );


  if (
    !isImage &&
    !isVideo
  ) {

    errorElement.textContent =
      "Please choose an image or video.";

    return;

  }


  saveButton.disabled = true;

  progress.classList.remove(
    "hidden"
  );


  let uploadedPath = null;


  try {

    const extension =
      getFileExtension(
        file.name
      );


    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}.${extension}`;


    const folder =
      isVideo
        ? "videos"
        : "photos";


    uploadedPath =
      `${folder}/${uniqueName}`;


    const {
      error: uploadError
    } =
      await supabaseClient.storage
        .from(BUCKET_NAME)
        .upload(
          uploadedPath,
          file,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              file.type
          }
        );


    if (uploadError) {

      throw uploadError;

    }


    const {
      error: insertError
    } =
      await supabaseClient
        .from("memories")
        .insert({
          file_path:
            uploadedPath,

          type:
            isVideo
              ? "video"
              : "image",

          section_id:
            sectionId || null,

          date:
            date || null,

          location:
            location || null,

          caption:
            caption || null
        });


    if (insertError) {

      await supabaseClient.storage
        .from(BUCKET_NAME)
        .remove([
          uploadedPath
        ]);

      throw insertError;

    }


    closeModal(
      memoryModal
    );


    document
      .getElementById("memoryForm")
      .reset();


    await loadMemories();

    renderGallery();


    showToast(
      "memory saved ♡"
    );


  } catch (error) {

    console.error(error);

    errorElement.textContent =
      "Something went wrong saving that memory. Please try again.";

  } finally {

    saveButton.disabled = false;

    progress.classList.add(
      "hidden"
    );

  }

}


/* ============================================================
   DELETE MEMORY
   ============================================================ */

async function deleteMemory(
  memory
) {

  if (!isAdmin) return;


  const confirmed =
    confirm(
      "Delete this memory?\n\n" +
      "This will permanently remove the memory and its media file."
    );


  if (!confirmed) return;


  const {
    error: databaseError
  } =
    await supabaseClient
      .from("memories")
      .delete()
      .eq(
        "id",
        memory.id
      );


  if (databaseError) {

    console.error(
      databaseError
    );

    showToast(
      "couldn't delete that memory"
    );

    return;

  }


  const {
    error: storageError
  } =
    await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([
        memory.file_path
      ]);


  if (storageError) {

    console.error(
      storageError
    );

    showToast(
      "memory deleted, but its media file couldn't be removed"
    );

  } else {

    showToast(
      "memory deleted ♡"
    );

  }


  await loadMemories();

  renderGallery();

}


/* ============================================================
   STORAGE
   ============================================================ */

function getPublicUrl(path) {

  const {
    data
  } =
    supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(
        path
      );


  return data.publicUrl;

}


/* ============================================================
   DATE
   ============================================================ */

function formatDate(
  dateString
) {

  const [
    year,
    month,
    day
  ] =
    dateString
      .split("-")
      .map(Number);


  const date =
    new Date(
      year,
      month - 1,
      day
    );


  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  ).format(date);

}


/* ============================================================
   LIGHTBOX
   ============================================================ */

function openLightbox(
  url,
  type
) {

  lightboxContent.innerHTML =
    "";


  if (
    type === "video"
  ) {

    const video =
      document.createElement(
        "video"
      );


    video.src =
      url;

    video.controls =
      true;

    video.playsInline =
      true;

    video.preload =
      "metadata";


    lightboxContent.appendChild(
      video
    );

  } else {

    const image =
      document.createElement(
        "img"
      );


    image.src =
      url;

    image.alt =
      "Expanded memory";


    lightboxContent.appendChild(
      image
    );

  }


  lightbox.classList.remove(
    "hidden"
  );

}


function closeLightbox() {

  lightbox.classList.add(
    "hidden"
  );

  lightboxContent.innerHTML =
    "";

}


/* ============================================================
   MODALS
   ============================================================ */

function openModal(
  modal
) {

  modal.classList.remove(
    "hidden"
  );

}


function closeModal(
  modal
) {

  if (!modal) return;

  modal.classList.add(
    "hidden"
  );

}


/* ============================================================
   SECTION SELECT
   ============================================================ */

function populateSectionSelect() {

  const select =
    document.getElementById(
      "memorySection"
    );


  select.innerHTML = "";


  const allOption =
    document.createElement(
      "option"
    );


  allOption.value = "";

  allOption.textContent =
    "all memories ♡";


  select.appendChild(
    allOption
  );


  sections.forEach(
    section => {

      const option =
        document.createElement(
          "option"
        );


      option.value =
        section.id;


      option.textContent =
        section.title;


      select.appendChild(
        option
      );

    }
  );

}


/* ============================================================
   HELPERS
   ============================================================ */

function getFileExtension(
  filename
) {

  const parts =
    filename.split(".");


  if (
    parts.length < 2
  ) {

    return "file";

  }


  return parts
    .pop()
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}


let toastTimeout;


function showToast(
  message
) {

  clearTimeout(
    toastTimeout
  );


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  toastTimeout =
    setTimeout(
      () => {

        toast.classList.remove(
          "show"
        );

      },
      3000
    );

}
