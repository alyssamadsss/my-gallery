const SUPABASE_URL =
  "https://jaubryfyktdfzxqbrzue.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qNcbkgifCJVk0cX7A7oRXg_AtlSlAld";

const ADMIN_UID =
  "dabf4e39-9760-4041-be58-b6a6c42e0351";

const BUCKET_NAME = "gallery";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

let currentUser = null;
let isAdmin = false;

let sections = [];
let memories = [];

let currentSection = null;
let currentSort = "newest";

let editingMemoryId = null;

let draggedSectionId = null;


/* ============================================================
   DOM
   ============================================================ */

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


/* ============================================================
   INITIALIZE
   ============================================================ */

document.addEventListener(
  "DOMContentLoaded",
  initialize
);


async function initialize() {

  createEditMemoryModal();

  setupEventListeners();

  await checkSession();

  await loadSections();

  await loadMemories();

  renderNavigation();

  renderGallery();

}


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

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

      resetMemoryForm();

      populateSectionSelect();

      document.getElementById(
        "memoryModalTitle"
      ).textContent =
        "add a little memory";

      document.getElementById(
        "memoryModalSubtitle"
      ).textContent =
        "keep a little piece of today";

      document.getElementById(
        "saveMemoryButton"
      ).textContent =
        "save memory ♡";

      openModal(memoryModal);

    }
  );


  newSectionButton.addEventListener(
    "click",
    () => {

      if (!isAdmin) return;

      document.getElementById(
        "sectionForm"
      ).reset();

      document.getElementById(
        "sectionError"
      ).textContent = "";

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

      if (event.key === "Escape") {

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

      await loadSections();

      await loadMemories();

      renderNavigation();

      renderGallery();

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


  /*
    Verify the user with Supabase Auth rather
    than trusting only browser-stored session data.
  */

  const {
    data: userData,
    error
  } =
    await supabaseClient.auth.getUser();


  if (
    error ||
    !userData?.user
  ) {

    currentUser = null;

    isAdmin = false;

    updateAdminUI();

    return;

  }


  currentUser =
    userData.user;


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

    adminButton.textContent =
      "🔒 admin";

  } else {

    adminControls.classList.add(
      "hidden"
    );

    adminButton.textContent =
      "🔒 admin";

  }

}


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


  isAdmin = true;

  updateAdminUI();

  showToast(
    "welcome back ♡"
  );

}


/* ============================================================
   LOGOUT
   ============================================================ */

async function logout() {

  await supabaseClient.auth.signOut();

  currentUser = null;

  isAdmin = false;

  updateAdminUI();

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
        "sort_order",
        {
          ascending: true
        }
      )
      .order(
        "created_at",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "loadSections:",
      error
    );

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


  /*
    ALL MEMORIES IS ALWAYS FIRST.
    It is not a database section.
  */

  const allButton =
    document.createElement(
      "button"
    );


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


  /*
    Custom sections.
  */

  sections.forEach(
    section => {

      const wrapper =
        document.createElement(
          "div"
        );


      wrapper.className =
        "section-nav-item";


      wrapper.draggable =
        isAdmin;


      wrapper.dataset.sectionId =
        section.id;


      const button =
        document.createElement(
          "button"
        );


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


      if (
        section.subtitle
      ) {

        button.title =
          section.subtitle;

      }


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

        /*
          Drag handle.
        */

        const handle =
          document.createElement(
            "span"
          );


        handle.className =
          "section-drag-handle";


        handle.textContent =
          "⠿";


        handle.title =
          "drag to reorder";


        wrapper.insertBefore(
          handle,
          button
        );


        /*
          Remove button.
        */

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


        /*
          Drag events.
        */

        wrapper.addEventListener(
          "dragstart",
          event => {

            draggedSectionId =
              section.id;

            wrapper.classList.add(
              "dragging"
            );

            event.dataTransfer.effectAllowed =
              "move";

          }
        );


        wrapper.addEventListener(
          "dragend",
          () => {

            wrapper.classList.remove(
              "dragging"
            );

            draggedSectionId =
              null;

            clearDragHighlights();

          }
        );


        wrapper.addEventListener(
          "dragover",
          event => {

            event.preventDefault();

            if (
              draggedSectionId &&
              draggedSectionId !==
                section.id
            ) {

              wrapper.classList.add(
                "drag-over"
              );

            }

          }
        );


        wrapper.addEventListener(
          "dragleave",
          () => {

            wrapper.classList.remove(
              "drag-over"
            );

          }
        );


        wrapper.addEventListener(
          "drop",
          async event => {

            event.preventDefault();

            wrapper.classList.remove(
              "drag-over"
            );


            if (
              !draggedSectionId ||
              draggedSectionId ===
                section.id
            ) {

              return;

            }


            await reorderSections(
              draggedSectionId,
              section.id
            );

          }
        );

      }


      navigation.appendChild(
        wrapper
      );

    }
  );

}


function clearDragHighlights() {

  document
    .querySelectorAll(
      ".section-nav-item"
    )
    .forEach(
      element => {

        element.classList.remove(
          "drag-over",
          "dragging"
        );

      }
    );

}


/* ============================================================
   SECTION CREATION
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


  const nextSortOrder =
    sections.length
      ? Math.max(
          ...sections.map(
            section =>
              Number(
                section.sort_order || 0
              )
          )
        ) + 1
      : 1;


  const {
    error
  } =
    await supabaseClient
      .from("sections")
      .insert({
        title,
        subtitle:
          subtitle || null,
        sort_order:
          nextSortOrder
      });


  if (error) {

    console.error(
      "handleCreateSection:",
      error
    );

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
   SECTION REORDERING
   ============================================================ */

async function reorderSections(
  draggedId,
  targetId
) {

  if (!isAdmin) return;


  const currentOrder =
    [...sections];


  const draggedIndex =
    currentOrder.findIndex(
      section =>
        section.id === draggedId
    );


  const targetIndex =
    currentOrder.findIndex(
      section =>
        section.id === targetId
    );


  if (
    draggedIndex === -1 ||
    targetIndex === -1
  ) {

    return;

  }


  const [
    draggedSection
  ] =
    currentOrder.splice(
      draggedIndex,
      1
    );


  currentOrder.splice(
    targetIndex,
    0,
    draggedSection
  );


  /*
    Optimistically update the UI.
  */

  sections =
    currentOrder.map(
      (
        section,
        index
      ) => ({
        ...section,
        sort_order:
          index + 1
      })
    );


  renderNavigation();


  /*
    Save every order.
  */

  for (
    let index = 0;
    index < sections.length;
    index++
  ) {

    const section =
      sections[index];


    const {
      error
    } =
      await supabaseClient
        .from("sections")
        .update({
          sort_order:
            index + 1
        })
        .eq(
          "id",
          section.id
        );


    if (error) {

      console.error(
        "reorderSections:",
        error
      );

      showToast(
        "couldn't save the section order"
      );

      await loadSections();

      renderNavigation();

      return;

    }

  }


  showToast(
    "section order saved ♡"
  );

}


/* ============================================================
   SECTION REMOVAL
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
    Move memories into All Memories.
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

    console.error(
      "removeSection update:",
      updateError
    );

    showToast(
      "couldn't move the memories"
    );

    return;

  }


  /*
    Delete only the section.
  */

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

    console.error(
      "removeSection delete:",
      deleteError
    );

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

    console.error(
      "loadMemories:",
      error
    );

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
        Undated memories go after
        dated memories.
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


function compareDateTime(
  a,
  b
) {

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


    media.controls =
      true;

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

      media.classList.add(
        "media-error"
      );

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


    const editButton =
      document.createElement(
        "button"
      );


    editButton.className =
      "edit-memory";


    editButton.textContent =
      "✏️ edit";


    editButton.addEventListener(
      "click",
      () => {

        openEditMemory(
          memory
        );

      }
    );


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
      editButton
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

      /*
        Clean up the uploaded file
        if the database insert fails.
      */

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


    resetMemoryForm();


    await loadMemories();

    renderGallery();


    showToast(
      "memory saved ♡"
    );


  } catch (error) {

    console.error(
      "handleAddMemory:",
      error
    );

    errorElement.textContent =
      "Something went wrong saving that memory. Please try again.";

  } finally {

    saveButton.disabled =
      false;

    progress.classList.add(
      "hidden"
    );

  }

}


/* ============================================================
   EDIT MEMORY MODAL
   ============================================================ */

function createEditMemoryModal() {

  if (
    document.getElementById(
      "editMemoryModal"
    )
  ) {

    return;

  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "editMemoryModal";


  modal.className =
    "modal hidden";


  modal.innerHTML = `
    <div class="modal-backdrop"></div>

    <div class="modal-card large-modal">

      <button
        class="modal-close"
        id="editMemoryClose"
        type="button"
      >
        ×
      </button>

      <div class="modal-heading">

        <span>✏️</span>

        <h2>edit memory</h2>

        <p>
          make a little change ♡
        </p>

      </div>

      <form id="editMemoryForm">

        <label>
          Section

          <select id="editMemorySection"></select>

        </label>

        <label>
          Date

          <input
            id="editMemoryDate"
            type="date"
          >

        </label>

        <label>
          Location

          <input
            id="editMemoryLocation"
            type="text"
            placeholder="Toronto, Canada"
          >

        </label>

        <label>
          Caption

          <textarea
            id="editMemoryCaption"
            rows="4"
            placeholder="the sweetest little day ♡"
          ></textarea>

        </label>

        <p
          id="editMemoryError"
          class="form-error"
        ></p>

        <button
          type="submit"
          class="primary-button full-width"
          id="saveEditMemoryButton"
        >
          save changes ♡
        </button>

      </form>

    </div>
  `;


  document.body.appendChild(
    modal
  );


  document
    .getElementById(
      "editMemoryClose"
    )
    .addEventListener(
      "click",
      () => {

        closeModal(
          modal
        );

      }
    );


  modal
    .querySelector(
      ".modal-backdrop"
    )
    .addEventListener(
      "click",
      () => {

        closeModal(
          modal
        );

      }
    );


  document
    .getElementById(
      "editMemoryForm"
    )
    .addEventListener(
      "submit",
      saveEditedMemory
    );

}


function openEditMemory(
  memory
) {

  if (!isAdmin) return;


  editingMemoryId =
    memory.id;


  const select =
    document.getElementById(
      "editMemorySection"
    );


  select.innerHTML = "";


  const allOption =
    document.createElement(
      "option"
    );


  allOption.value =
    "";


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


  select.value =
    memory.section_id || "";


  document.getElementById(
    "editMemoryDate"
  ).value =
    memory.date || "";


  document.getElementById(
    "editMemoryLocation"
  ).value =
    memory.location || "";


  document.getElementById(
    "editMemoryCaption"
  ).value =
    memory.caption || "";


  document.getElementById(
    "editMemoryError"
  ).textContent = "";


  openModal(
    document.getElementById(
      "editMemoryModal"
    )
  );

}


async function saveEditedMemory(
  event
) {

  event.preventDefault();


  if (
    !isAdmin ||
    !editingMemoryId
  ) {

    return;

  }


  const saveButton =
    document.getElementById(
      "saveEditMemoryButton"
    );


  const errorElement =
    document.getElementById(
      "editMemoryError"
    );


  errorElement.textContent = "";


  saveButton.disabled =
    true;


  saveButton.textContent =
    "saving...";


  const sectionId =
    document.getElementById(
      "editMemorySection"
    ).value;


  const date =
    document.getElementById(
      "editMemoryDate"
    ).value;


  const location =
    document.getElementById(
      "editMemoryLocation"
    ).value.trim();


  const caption =
    document.getElementById(
      "editMemoryCaption"
    ).value.trim();


  const {
    error
  } =
    await supabaseClient
      .from("memories")
      .update({
        section_id:
          sectionId || null,

        date:
          date || null,

        location:
          location || null,

        caption:
          caption || null
      })
      .eq(
        "id",
        editingMemoryId
      );


  saveButton.disabled =
    false;


  saveButton.textContent =
    "save changes ♡";


  if (error) {

    console.error(
      "saveEditedMemory:",
      error
    );

    errorElement.textContent =
      "Couldn't save those changes. Please try again.";

    return;

  }


  closeModal(
    document.getElementById(
      "editMemoryModal"
    )
  );


  editingMemoryId =
    null;


  await loadMemories();

  renderGallery();


  showToast(
    "memory updated ♡"
  );

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
      "deleteMemory database:",
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
      "deleteMemory storage:",
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

function getPublicUrl(
  path
) {

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


  allOption.value =
    "";


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
   RESET ADD-MEMORY FORM
   ============================================================ */

function resetMemoryForm() {

  const form =
    document.getElementById(
      "memoryForm"
    );


  if (form) {

    form.reset();

  }


  document.getElementById(
    "memoryError"
  ).textContent = "";


  document.getElementById(
    "uploadProgress"
  ).classList.add(
    "hidden"
  );


  document.getElementById(
    "memoryFile"
  ).value = "";

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


/* ============================================================
   SMALL DYNAMIC STYLES FOR NEW ADMIN FEATURES
   ============================================================ */

(function addDynamicStyles() {

  const style =
    document.createElement(
      "style"
    );


  style.textContent = `
    .section-nav-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .section-nav-item .nav-item {
      flex: 1;
    }

    .section-drag-handle {
      cursor: grab;
      user-select: none;
      opacity: 0.55;
      padding: 4px;
      font-size: 16px;
      line-height: 1;
    }

    .section-drag-handle:active {
      cursor: grabbing;
    }

    .section-nav-item.dragging {
      opacity: 0.45;
    }

    .section-nav-item.drag-over {
      transform: translateY(-2px);
    }

    .remove-section,
    .edit-memory,
    .delete-memory {
      border: 0;
      background: transparent;
      cursor: pointer;
    }

    .edit-memory {
      margin-right: 8px;
    }

    .memory-admin {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    .media-error {
      opacity: 0.4;
    }

    #editMemoryModal .modal-card {
      max-height: 90vh;
      overflow-y: auto;
    }

    #editMemoryModal textarea {
      resize: vertical;
    }
  `;


  document.head.appendChild(
    style
  );

})();
