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




/* ============================================================
   GLOBAL STATE
   ============================================================ */


let currentUser = null;
let isAdmin = false;


let sections = [];
let memories = [];


let currentSection = null;
let currentSort = "newest";


let editingMemoryId = null;
let draggedSectionId = null;


let visitorId = getVisitorId();
let currentSessionId = null;


let presenceInterval = null;
let presenceDisplayInterval = null;


let sessionStartedAt = null;
let lastPresenceUpdate = null;


let presenceStarted = false;




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


  await startVisitorTracking();


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


      const title =
        document.getElementById(
          "memoryModalTitle"
        );


      const subtitle =
        document.getElementById(
          "memoryModalSubtitle"
        );


      if (title) {


        title.textContent =
          "add a little memory";


      }


      if (subtitle) {


        subtitle.textContent =
          "keep a little piece of today";


      }


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


      document
        .getElementById("sectionForm")
        .reset();


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
    .forEach(
      button => {


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


      }
    );




  document
    .querySelectorAll(".modal-backdrop")
    .forEach(
      backdrop => {


        backdrop.addEventListener(
          "click",
          () => {


            closeModal(
              backdrop.parentElement
            );


          }
        );


      }
    );




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




  /*
    When the visitor leaves the page/tab,
    send one final heartbeat.
  */


  document.addEventListener(
    "visibilitychange",
    () => {


      if (
        document.visibilityState ===
        "visible"
      ) {


        updateVisitorPresence();


      } else {


        updateVisitorPresence();


      }


    }
  );




  window.addEventListener(
    "beforeunload",
    () => {


      updateVisitorPresence();


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


      updatePresenceDisplay();


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




async function processSession(
  session
) {


  currentUser =
    session?.user || null;




  if (!currentUser) {


    isAdmin = false;


    updateAdminUI();


    removePresenceDisplay();


    return;


  }




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


    removePresenceDisplay();


    return;


  }




  currentUser =
    userData.user;




  if (
    currentUser.id !==
    ADMIN_UID
  ) {


    isAdmin = false;


    updateAdminUI();


    removePresenceDisplay();


    await supabaseClient.auth.signOut();


    showToast(
      "that account isn't the gallery admin ♡"
    );


    return;


  }




  isAdmin = true;


  updateAdminUI();


  startAdminPresenceDisplay();


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




async function handleLogin(
  event
) {


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




  errorElement.textContent =
    "";




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
    data.user.id !==
    ADMIN_UID
  ) {


    await supabaseClient.auth.signOut();


    errorElement.textContent =
      "This account isn't authorized as the gallery admin.";


    return;


  }




  closeModal(
    loginModal
  );




  document
    .getElementById("loginForm")
    .reset();




  isAdmin = true;


  updateAdminUI();


  startAdminPresenceDisplay();


  showToast(
    "welcome back ♡"
  );


}




async function logout() {


  await supabaseClient.auth.signOut();


  currentUser = null;


  isAdmin = false;


  updateAdminUI();


  removePresenceDisplay();


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


  navigation.innerHTML =
    "";




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


      currentSection =
        null;


      updateVisitorPresence();


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
        currentSection ===
        section.id
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


          updateVisitorPresence();


          renderNavigation();


          renderGallery();


        }
      );




      wrapper.appendChild(
        button
      );




      if (isAdmin) {


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
   CREATE SECTION
   ============================================================ */


async function handleCreateSection(
  event
) {


  event.preventDefault();




  if (!isAdmin) return;




  const title =
    document
      .getElementById(
        "sectionTitle"
      )
      .value
      .trim();




  const subtitle =
    document
      .getElementById(
        "sectionSubtitle"
      )
      .value
      .trim();




  const errorElement =
    document.getElementById(
      "sectionError"
    );




  errorElement.textContent =
    "";




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
                section.sort_order ||
                0
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




  closeModal(
    sectionModal
  );




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
   REORDER SECTIONS
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
        section.id ===
        draggedId
    );




  const targetIndex =
    currentOrder.findIndex(
      section =>
        section.id ===
        targetId
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




  const {
    error: updateError
  } =
    await supabaseClient
      .from("memories")
      .update({
        section_id:
          null
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
    currentSection ===
    section.id
  ) {


    currentSection =
      null;


  }




  await loadSections();


  await loadMemories();


  renderNavigation();


  renderGallery();


  updateVisitorPresence();




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


function sortMemories(
  items
) {


  return [...items].sort(
    (a, b) => {


      if (
        currentSort ===
        "recent"
      ) {


        return compareDateTime(
          b.created_at,
          a.created_at
        );


      }




      if (
        !a.date &&
        !b.date
      ) {


        return compareDateTime(
          b.created_at,
          a.created_at
        );


      }




      if (!a.date)
        return 1;




      if (!b.date)
        return -1;




      const comparison =
        a.date.localeCompare(
          b.date
        );




      if (
        currentSort ===
        "oldest"
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


  gallery.innerHTML =
    "";




  let visibleMemories =
    memories;




  if (
    currentSection !==
    null
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
    visibleMemories.length ===
    0
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
    memory.type ===
    "video"
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




  errorElement.textContent =
    "";




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




  saveButton.disabled =
    true;


  progress.classList.remove(
    "hidden"
  );




  let uploadedPath =
    null;




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
        .from(
          BUCKET_NAME
        )
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
            sectionId ||
            null,


          date:
            date ||
            null,


          location:
            location ||
            null,


          caption:
            caption ||
            null
        });




    if (insertError) {


      await supabaseClient.storage
        .from(
          BUCKET_NAME
        )
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
   EDIT MEMORY
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




  select.innerHTML =
    "";




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
    memory.section_id ||
    "";




  document.getElementById(
    "editMemoryDate"
  ).value =
    memory.date ||
    "";




  document.getElementById(
    "editMemoryLocation"
  ).value =
    memory.location ||
    "";




  document.getElementById(
    "editMemoryCaption"
  ).value =
    memory.caption ||
    "";




  document.getElementById(
    "editMemoryError"
  ).textContent =
    "";




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




  errorElement.textContent =
    "";




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
          sectionId ||
          null,


        date:
          date ||
          null,


        location:
          location ||
          null,


        caption:
          caption ||
          null
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
      .from(
        BUCKET_NAME
      )
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
   VISITOR ID
   ============================================================ */


function getVisitorId() {


  let id =
    localStorage.getItem(
      "gallery_visitor_id"
    );




  if (!id) {


    id =
      crypto.randomUUID();


    localStorage.setItem(
      "gallery_visitor_id",
      id
    );


  }




  return id;


}




/* ============================================================
   VISITOR TRACKING
   ============================================================ */


/*
  This is the important part.


  visitorId = the browser/device identity.


  currentSessionId = one particular visit.


  Example:


  Visitor A:
      visitorId = abc123


  Visit 1:
      session = session001


  Visit 2:
      session = session002


  Visit 3:
      session = session003


  All three sessions belong to visitor abc123.
*/




async function startVisitorTracking() {


  if (presenceStarted)
    return;




  presenceStarted =
    true;




  await startOrResumeSession();




  presenceInterval =
    setInterval(
      updateVisitorPresence,
      15000
    );




  if (isAdmin) {


    startAdminPresenceDisplay();


  }


}




async function startOrResumeSession() {


  const now =
    new Date();




  /*
    First make sure the visitor exists.
  */


  const {
    data: visitor,
    error: visitorError
  } =
    await supabaseClient
      .from("gallery_visitors")
      .select("*")
      .eq(
        "visitor_id",
        visitorId
      )
      .maybeSingle();




  if (visitorError) {


    console.error(
      "visitor lookup failed:",
      visitorError
    );


    return;


  }




  if (!visitor) {


    const {
      error
    } =
      await supabaseClient
        .from("gallery_visitors")
        .insert({
          visitor_id:
            visitorId,


          first_seen:
            now.toISOString(),


          last_seen:
            now.toISOString(),


          visit_count:
            1
        });




    if (error) {


      console.error(
        "visitor creation failed:",
        error
      );


    }


  } else {


    const {
      error
    } =
      await supabaseClient
        .from("gallery_visitors")
        .update({


          last_seen:
            now.toISOString(),


          visit_count:
            Number(
              visitor.visit_count || 0
            ) + 1


        })
        .eq(
          "visitor_id",
          visitorId
        );




    if (error) {


      console.error(
        "visitor update failed:",
        error
      );


    }


  }




  /*
    Look for an existing active session.


    If the last session was active less than
    45 seconds ago, continue it.


    Otherwise create a brand-new visit.
  */


  const cutoff =
    new Date(
      Date.now() -
      45000
    ).toISOString();




  const {
    data: activeSession,
    error: sessionError
  } =
    await supabaseClient
      .from("gallery_sessions")
      .select("*")
      .eq(
        "visitor_id",
        visitorId
      )
      .gte(
        "last_seen",
        cutoff
      )
      .order(
        "last_seen",
        {
          ascending: false
        }
      )
      .limit(1)
      .maybeSingle();




  if (sessionError) {


    console.error(
      "active session lookup failed:",
      sessionError
    );


    return;


  }




  if (activeSession) {


    currentSessionId =
      activeSession.id;


    sessionStartedAt =
      new Date(
        activeSession.started_at
      );


    lastPresenceUpdate =
      new Date(
        activeSession.last_seen
      );


    return;


  }




  /*
    No active session = NEW VISIT.
  */


  const {
    data: newSession,
    error: newSessionError
  } =
    await supabaseClient
      .from("gallery_sessions")
      .insert({


        visitor_id:
          visitorId,


        started_at:
          now.toISOString(),


        last_seen:
          now.toISOString(),


        ended_at:
          null,


        total_seconds:
          0,


        current_section_id:
          currentSection,


        sections_visited:
          currentSection
            ? [currentSection]
            : []


      })
      .select()
      .single();




  if (newSessionError) {


    console.error(
      "new session creation failed:",
      newSessionError
    );


    return;


  }




  currentSessionId =
    newSession.id;


  sessionStartedAt =
    now;


  lastPresenceUpdate =
    now;


}




/* ============================================================
   UPDATE VISITOR PRESENCE
   ============================================================ */


async function updateVisitorPresence() {


  if (!currentSessionId)
    return;




  try {


    const now =
      new Date();




    /*
      Calculate how many seconds have passed
      since the previous heartbeat.
    */


    let elapsedSeconds =
      0;




    if (lastPresenceUpdate) {


      elapsedSeconds =
        Math.floor(
          (
            now.getTime() -
            lastPresenceUpdate.getTime()
          ) / 1000
        );


    }




    /*
      Never accidentally add huge amounts of time
      if the browser was sleeping.
    */


    elapsedSeconds =
      Math.max(
        0,
        Math.min(
          elapsedSeconds,
          30
        )
      );




    lastPresenceUpdate =
      now;




    /*
      Get the existing session.
    */


    const {
      data: session,
      error: fetchError
    } =
    await supabaseClient
      .from("gallery_sessions")
      .select("*")
      .eq(
        "id",
        currentSessionId
      )
      .maybeSingle();




    if (fetchError) {


      console.error(
        "session fetch failed:",
        fetchError
      );


      return;


    }




    if (!session) {


      currentSessionId =
        null;


      await startOrResumeSession();


      return;


    }




    /*
      Update sections visited.
    */


    let visited =
      Array.isArray(
        session.sections_visited
      )
        ? [
            ...session.sections_visited
          ]
        : [];




    if (
      currentSection &&
      !visited.includes(
        currentSection
      )
    ) {


      visited.push(
        currentSection
      );


    }




    const newTotal =
      Number(
        session.total_seconds || 0
      ) +
      elapsedSeconds;




    /*
      Save the heartbeat.
    */


    const {
      error: updateError
    } =
      await supabaseClient
        .from("gallery_sessions")
        .update({


          last_seen:
            now.toISOString(),


          ended_at:
            null,


          total_seconds:
            newTotal,


          current_section_id:
            currentSection,


          sections_visited:
            visited


        })
        .eq(
          "id",
          currentSessionId
        );




    if (updateError) {


      console.error(
        "session update failed:",
        updateError
      );


      return;


    }




    /*
      Also update the visitor's overall record.
    */


    await supabaseClient
      .from("gallery_visitors")
      .update({


        last_seen:
          now.toISOString()


      })
      .eq(
        "visitor_id",
        visitorId
      );




    if (isAdmin) {


      updatePresenceDisplay();


    }


  } catch (error) {


    console.error(
      "visitor presence failed:",
      error
    );


  }


}




/* ============================================================
   STALE SESSION CLEANUP
   ============================================================ */


async function cleanStaleSessions() {


  const cutoff =
    new Date(
      Date.now() -
      45000
    ).toISOString();




  /*
    We don't DELETE old sessions.


    We simply mark sessions that haven't
    checked in recently as ended.


    This is what gives you proper history.
  */


  const {
    data,
    error
  } =
    await supabaseClient
      .from("gallery_sessions")
      .select("id, last_seen, ended_at")
      .lt(
        "last_seen",
        cutoff
      )
      .is(
        "ended_at",
        null
      );




  if (error) {


    console.error(
      "stale session lookup failed:",
      error
    );


    return;


  }




  if (!data?.length)
    return;




  for (
    const session of data
  ) {


    await supabaseClient
      .from("gallery_sessions")
      .update({


        ended_at:
          session.last_seen


      })
      .eq(
        "id",
        session.id
      );


  }


}




/* ============================================================
   ACTIVE VISITORS
   ============================================================ */


async function getActiveVisitors() {


  const cutoff =
    new Date(
      Date.now() -
      45000
    ).toISOString();




  const {
    data,
    error
  } =
    await supabaseClient
      .from("gallery_sessions")
      .select("*")
      .gte(
        "last_seen",
        cutoff
      )
      .is(
        "ended_at",
        null
      )
      .order(
        "last_seen",
        {
          ascending: false
        }
      );




  if (error) {


    console.error(
      "active visitor lookup failed:",
      error
    );


    return [];


  }




  /*
    Don't count yourself as a visitor.
  */


  return (
    data || []
  ).filter(
    session =>
      session.visitor_id !==
      visitorId
  );


}




/* ============================================================
   ADMIN PRESENCE PANEL
   ============================================================ */


function createPresenceDisplay() {


  if (
    document.getElementById(
      "livePresence"
    )
  ) {


    return;


  }




  if (!isAdmin)
    return;




  const header =
    document.querySelector(
      ".site-header"
    );




  if (!header)
    return;




  const display =
    document.createElement(
      "div"
    );




  display.id =
    "livePresence";




  display.className =
    "live-presence";




  display.innerHTML = `
    <div class="presence-summary">


      <div class="presence-main">


        <span class="presence-heart">
          ♡
        </span>


        <span>
          checking...
        </span>


      </div>


    </div>
  `;




  header.appendChild(
    display
  );




  updatePresenceDisplay();


}




function removePresenceDisplay() {


  const display =
    document.getElementById(
      "livePresence"
    );




  if (display) {


    display.remove();


  }




  if (
    presenceDisplayInterval
  ) {


    clearInterval(
      presenceDisplayInterval
    );


    presenceDisplayInterval =
      null;


  }


}




function startAdminPresenceDisplay() {


  if (!isAdmin)
    return;




  createPresenceDisplay();




  if (
    presenceDisplayInterval
  ) {


    return;


  }




  presenceDisplayInterval =
    setInterval(
      updatePresenceDisplay,
      5000
    );


}




async function updatePresenceDisplay() {


  if (!isAdmin) {


    removePresenceDisplay();


    return;


  }




  createPresenceDisplay();




  await cleanStaleSessions();




  const visitors =
    await getActiveVisitors();




  const display =
    document.getElementById(
      "livePresence"
    );




  if (!display)
    return;




  let html = `


    <div class="presence-summary">


      <div class="presence-main">


        <span class="presence-heart">
          ♡
        </span>


        <span>
          mads is online
        </span>


      </div>


      <div class="visitor-count">


        👀 ${visitors.length}


        ${
          visitors.length === 1
            ? "visitor"
            : "visitors"
        }


      </div>


    </div>


  `;




  if (
    visitors.length
  ) {


    html +=
      `<div class="visitor-list">`;




    visitors.forEach(
      (
        session,
        index
      ) => {


        const duration =
          getLiveSessionDuration(
            session
          );




        const currentSectionName =
          getSectionName(
            session.current_section_id
          );




        const visitedNames =
          (
            session.sections_visited ||
            []
          )
            .map(
              id =>
                getSectionName(id)
            )
            .filter(Boolean);




        html += `


          <div class="visitor-card">


            <div class="visitor-title">


              <strong>
                Visitor ${index + 1}
              </strong>


              <span>
                ${duration}
              </span>


            </div>


            <div class="visitor-current">


              📍
              ${escapeHtml(
                currentSectionName
              )}


            </div>


            <div class="visitor-sections">


              <span class="visitor-label">
                sections visited
              </span>


              <div class="visitor-section-tags">


                ${
                  visitedNames.length
                    ? visitedNames
                        .map(
                          name =>
                            `<span class="visitor-tag">
                              ${escapeHtml(name)}
                            </span>`
                        )
                        .join("")
                    : `<span class="visitor-muted">
                        all memories ♡
                      </span>`
                }


              </div>


            </div>


            <div class="visitor-total">


              ⏱️ current visit:
              <strong>
                ${formatDuration(
                  session.total_seconds || 0
                )}
              </strong>


            </div>


          </div>


        `;


      }
    );




    html +=
      `</div>`;


  }




  display.innerHTML =
    html;


}




/* ============================================================
   SESSION DURATION
   ============================================================ */


function getLiveSessionDuration(
  session
) {


  if (
    !session.started_at
  ) {


    return "0s";


  }




  const started =
    new Date(
      session.started_at
    ).getTime();




  const seconds =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          started
        ) / 1000
      )
    );




  return formatDuration(
    seconds
  );


}




/* ============================================================
   SECTION HELPERS
   ============================================================ */


function getSectionName(
  sectionId
) {


  if (!sectionId) {


    return "all memories ♡";


  }




  const section =
    sections.find(
      item =>
        item.id ===
        sectionId
    );




  return section
    ? section.title
    : "unknown section";


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
      .from(
        BUCKET_NAME
      )
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
   DURATION
   ============================================================ */


function formatDuration(
  seconds
) {


  seconds =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );




  if (
    seconds < 60
  ) {


    return `${seconds}s`;


  }




  const minutes =
    Math.floor(
      seconds / 60
    );




  const remainingSeconds =
    seconds % 60;




  if (
    minutes < 60
  ) {


    return `${minutes}m ${remainingSeconds}s`;


  }




  const hours =
    Math.floor(
      minutes / 60
    );




  const remainingMinutes =
    minutes % 60;




  return `${hours}h ${remainingMinutes}m`;


}




/* ============================================================
   ESCAPE HTML
   ============================================================ */


function escapeHtml(
  value
) {


  return String(
    value || ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );


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




  select.innerHTML =
    "";




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
   RESET MEMORY FORM
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
  ).textContent =
    "";




  document.getElementById(
    "uploadProgress"
  ).classList.add(
    "hidden"
  );




  document.getElementById(
    "memoryFile"
  ).value =
    "";


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
   DYNAMIC STYLES
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


    .live-presence {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 8px;
      font-size: 13px;
      opacity: 0.72;
      letter-spacing: 0.1px;
    }


    .presence-summary {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }


    .presence-main {
      display: flex;
      align-items: center;
      gap: 6px;
    }


    .presence-heart {
      display: inline-block;
      animation: presenceHeartPulse 1.5s ease-in-out infinite;
      transform-origin: center;
      font-size: 15px;
    }


    .visitor-count {
      opacity: 0.7;
    }


    .visitor-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 6px;
    }


    .visitor-card {
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.5);
      font-size: 12px;
      line-height: 1.5;
    }


    .visitor-title {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }


    .visitor-title span {
      opacity: 0.65;
    }


    .visitor-current {
      margin-top: 3px;
    }


    .visitor-sections {
      margin-top: 5px;
    }


    .visitor-label {
      opacity: 0.6;
      display: block;
      margin-bottom: 3px;
    }


    .visitor-section-tags {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
    }


    .visitor-tag {
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(255,255,255,0.7);
    }


    .visitor-muted {
      opacity: 0.55;
    }


    .visitor-total {
      margin-top: 6px;
    }


    @keyframes presenceHeartPulse {


      0% {
        transform: scale(1);
        opacity: 0.7;
      }


      50% {
        transform: scale(1.25);
        opacity: 1;
      }


      100% {
        transform: scale(1);
        opacity: 0.7;
      }


    }


  `;




  document.head.appendChild(
    style
  );


})();
/* ============================================================
   VISITOR HISTORY
   ============================================================ */


let currentVisitId =
  localStorage.getItem(
    "gallery_current_visit_id"
  );


let currentVisitStartedAt =
  localStorage.getItem(
    "gallery_current_visit_started_at"
  );


let historySectionsVisited = [];


let visitorHistoryInterval = null;




/* ============================================================
   START / RESUME VISIT
   ============================================================ */


async function startVisitorHistory() {


  try {


    const now =
      Date.now();


    const previousStart =
      currentVisitStartedAt
        ? new Date(
            currentVisitStartedAt
          ).getTime()
        : 0;




    /*
      If there is no visit, or the previous
      visit started more than 45 seconds ago,
      create a new visit.
    */


    const shouldStartNewVisit =
      !currentVisitId ||
      !previousStart ||
      now - previousStart > 45000;




    if (
      shouldStartNewVisit
    ) {


      currentVisitId =
        null;


      currentVisitStartedAt =
        new Date().toISOString();


      historySectionsVisited =
        currentSection
          ? [currentSection]
          : [];




      const {
        data,
        error
      } =
        await supabaseClient
          .from(
            "gallery_visit_history"
          )
          .insert({


            visitor_id:
              visitorId,


            started_at:
              currentVisitStartedAt,


            duration_seconds:
              0,


            sections_visited:
              historySectionsVisited,


            last_section_id:
              currentSection


          })
          .select(
            "id"
          )
          .single();




      if (error) {


        console.error(
          "Visitor history start failed:",
          error
        );


        return;


      }




      currentVisitId =
        data.id;




      localStorage.setItem(
        "gallery_current_visit_id",
        currentVisitId
      );




      localStorage.setItem(
        "gallery_current_visit_started_at",
        currentVisitStartedAt
      );


    }




    /*
      Make sure the current section is included.
    */


    if (
      currentSection &&
      !historySectionsVisited.includes(
        currentSection
      )
    ) {


      historySectionsVisited.push(
        currentSection
      );


    }




    updateVisitorHistory();




  } catch (error) {


    console.error(
      "startVisitorHistory:",
      error
    );


  }


}




/* ============================================================
   UPDATE CURRENT VISIT
   ============================================================ */


async function updateVisitorHistory() {


  if (
    !currentVisitId ||
    !currentVisitStartedAt
  ) {


    return;


  }




  try {


    if (
      currentSection &&
      !historySectionsVisited.includes(
        currentSection
      )
    ) {


      historySectionsVisited.push(
        currentSection
      );


    }




    const started =
      new Date(
        currentVisitStartedAt
      ).getTime();




    const duration =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            started
          ) / 1000
        )
      );




    const {
      error
    } =
      await supabaseClient.rpc(
        "update_gallery_visit",
        {


          p_id:
            currentVisitId,


          p_duration_seconds:
            duration,


          p_ended_at:
            new Date().toISOString(),


          p_sections_visited:
            historySectionsVisited,


          p_last_section_id:
            currentSection


        }
      );




    if (error) {


      console.error(
        "Visitor history update failed:",
        error
      );


    }


  } catch (error) {


    console.error(
      "updateVisitorHistory:",
      error
    );


  }


}




/* ============================================================
   NEW SECTION VISIT
   ============================================================ */


function recordHistorySection() {


  if (
    currentSection &&
    !historySectionsVisited.includes(
      currentSection
    )
  ) {


    historySectionsVisited.push(
      currentSection
    );


  }




  updateVisitorHistory();


}




/* ============================================================
   END VISIT
   ============================================================ */


async function endVisitorHistory() {


  await updateVisitorHistory();


}




/* ============================================================
   VISIBILITY HANDLING
   ============================================================ */


document.addEventListener(
  "visibilitychange",
  async () => {


    if (
      document.visibilityState ===
      "hidden"
    ) {


      await endVisitorHistory();


      return;


    }




    if (
      document.visibilityState ===
      "visible"
    ) {


      const lastStart =
        currentVisitStartedAt
          ? new Date(
              currentVisitStartedAt
            ).getTime()
          : 0;




      /*
        If they were gone for more than
        45 seconds, treat it as a new visit.
      */


      if (
        !lastStart ||
        Date.now() - lastStart > 45000
      ) {


        currentVisitId =
          null;


        currentVisitStartedAt =
          null;


        historySectionsVisited =
          [];


        localStorage.removeItem(
          "gallery_current_visit_id"
        );


        localStorage.removeItem(
          "gallery_current_visit_started_at"
        );




        await startVisitorHistory();


      } else {


        await updateVisitorHistory();


      }


    }


  }
);




/* ============================================================
   BEFORE LEAVING PAGE
   ============================================================ */


window.addEventListener(
  "beforeunload",
  () => {


    /*
      We can't reliably await Supabase
      during beforeunload, so the regular
      15-second updates are the primary
      source of duration.
    */


    updateVisitorHistory();


  }
);




/* ============================================================
   HISTORY REFRESH
   ============================================================ */


function startVisitorHistoryUpdates() {


  if (
    visitorHistoryInterval
  ) {


    return;


  }




  visitorHistoryInterval =
    setInterval(
      () => {


        updateVisitorHistory();


      },
      15000
    );


}




/* ============================================================
   ADMIN HISTORY PANEL
   ============================================================ */


function createVisitorHistoryButton() {


  if (!isAdmin) return;




  if (
    document.getElementById(
      "visitorHistoryButton"
    )
  ) {


    return;


  }




  const display =
    document.getElementById(
      "livePresence"
    );




  if (!display) return;




  const button =
    document.createElement(
      "button"
    );




  button.id =
    "visitorHistoryButton";




  button.type =
    "button";




  button.textContent =
    "📖 visitor history";




  button.addEventListener(
    "click",
    openVisitorHistory
  );




  display.appendChild(
    button
  );


}




/* ============================================================
   OPEN HISTORY
   ============================================================ */


async function openVisitorHistory() {


  if (!isAdmin) return;




  let modal =
    document.getElementById(
      "visitorHistoryModal"
    );




  if (!modal) {


    modal =
      document.createElement(
        "div"
      );




    modal.id =
      "visitorHistoryModal";




    modal.className =
      "visitor-history-modal";




    modal.innerHTML = `


      <div class="visitor-history-backdrop"></div>


      <div class="visitor-history-card">


        <button
          class="visitor-history-close"
          type="button"
        >
          ×
        </button>


        <div class="visitor-history-heading">


          <span>📖</span>


          <div>


            <h2>visitor history</h2>


            <p>
              little footprints left behind ♡
            </p>


          </div>


        </div>


        <div
          id="visitorHistoryContent"
          class="visitor-history-content"
        >


          <div class="visitor-history-loading">
            loading history...
          </div>


        </div>


      </div>


    `;




    document.body.appendChild(
      modal
    );




    modal
      .querySelector(
        ".visitor-history-close"
      )
      .addEventListener(
        "click",
        () => {


          closeVisitorHistory();


        }
      );




    modal
      .querySelector(
        ".visitor-history-backdrop"
      )
      .addEventListener(
        "click",
        () => {


          closeVisitorHistory();


        }
      );


  }




  modal.classList.add(
    "show"
  );




  await loadVisitorHistory();


}




/* ============================================================
   CLOSE HISTORY
   ============================================================ */


function closeVisitorHistory() {


  const modal =
    document.getElementById(
      "visitorHistoryModal"
    );




  if (modal) {


    modal.classList.remove(
      "show"
    );


  }


}




/* ============================================================
   LOAD HISTORY
   ============================================================ */


async function loadVisitorHistory() {


  const content =
    document.getElementById(
      "visitorHistoryContent"
    );




  if (!content) return;




  content.innerHTML = `


    <div class="visitor-history-loading">
      loading history...
    </div>


  `;




  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "gallery_visit_history"
      )
      .select("*")
      .order(
        "started_at",
        {
          ascending: false
        }
      );




  if (error) {


    console.error(
      "loadVisitorHistory:",
      error
    );




    content.innerHTML = `


      <div class="visitor-history-error">
        couldn't load visitor history ♡
      </div>


    `;


    return;


  }




  if (
    !data ||
    data.length === 0
  ) {


    content.innerHTML = `


      <div class="visitor-history-empty">


        <div>
          ♡
        </div>


        <p>
          no visits recorded yet
        </p>


      </div>


    `;


    return;


  }




  content.innerHTML =
    "";




  data.forEach(
    (
      visit,
      index
    ) => {


      const card =
        document.createElement(
          "div"
        );




      card.className =
        "visitor-history-entry";




      const started =
        new Date(
          visit.started_at
        );




      const dateText =
        started.toLocaleDateString(
          undefined,
          {
            month:
              "short",


            day:
              "numeric",


            year:
              "numeric"
          }
        );




      const timeText =
        started.toLocaleTimeString(
          undefined,
          {
            hour:
              "numeric",


            minute:
              "2-digit"
          }
        );




      const duration =
        formatDuration(
          visit.duration_seconds ||
          0
        );




      const sectionNames =
        (
          visit.sections_visited ||
          []
        )
          .map(
            id =>
              getSectionName(id)
          )
          .filter(Boolean);




      const sectionsHtml =
        sectionNames.length
          ? sectionNames
              .map(
                name =>
                  `<span class="history-section-tag">
                    ${escapeHtml(name)}
                  </span>`
              )
              .join("")
          : `
              <span class="history-section-tag">
                all memories ♡
              </span>
            `;




      card.innerHTML = `


        <div class="history-entry-top">


          <strong>
            Visitor ${data.length - index}
          </strong>


          <span>
            ${escapeHtml(
              dateText
            )}
            ·
            ${escapeHtml(
              timeText
            )}
          </span>


        </div>


        <div class="history-entry-duration">


          ⏱️


          <strong>
            ${escapeHtml(
              duration
            )}
          </strong>


        </div>


        <div class="history-entry-sections">


          <span class="history-label">
            sections visited
          </span>


          <div class="history-section-tags">


            ${sectionsHtml}


          </div>


        </div>


        <div class="history-entry-id">


          visitor id:
          ${escapeHtml(
            visit.visitor_id
          )}


        </div>


      `;




      content.appendChild(
        card
      );


    }
  );


}




/* ============================================================
   HISTORY STYLES
   ============================================================ */


(function addVisitorHistoryStyles() {


  const style =
    document.createElement(
      "style"
    );




  style.textContent = `


    #visitorHistoryButton {
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
      font-size: 12px;
      opacity: 0.7;
      padding: 3px 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }


    #visitorHistoryButton:hover {
      opacity: 1;
    }


    .visitor-history-modal {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }


    .visitor-history-modal.show {
      display: flex;
    }


    .visitor-history-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(0,0,0,0.25);
      backdrop-filter: blur(4px);
    }


    .visitor-history-card {
      position: relative;
      z-index: 1;
      width: min(700px, 100%);
      max-height: 85vh;
      overflow-y: auto;
      background: #fff;
      border-radius: 18px;
      padding: 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    }


    .visitor-history-close {
      position: absolute;
      right: 15px;
      top: 12px;
      border: 0;
      background: transparent;
      font-size: 25px;
      cursor: pointer;
      opacity: 0.6;
    }


    .visitor-history-heading {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }


    .visitor-history-heading > span {
      font-size: 25px;
    }


    .visitor-history-heading h2 {
      margin: 0;
    }


    .visitor-history-heading p {
      margin: 3px 0 0;
      opacity: 0.6;
      font-size: 13px;
    }


    .visitor-history-content {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }


    .visitor-history-entry {
      padding: 13px 15px;
      border-radius: 12px;
      background: rgba(255,255,255,0.75);
      border: 1px solid rgba(0,0,0,0.06);
    }


    .history-entry-top {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }


    .history-entry-top span {
      opacity: 0.6;
      font-size: 12px;
    }


    .history-entry-duration {
      margin-top: 6px;
      font-size: 13px;
    }


    .history-entry-sections {
      margin-top: 7px;
    }


    .history-label {
      display: block;
      opacity: 0.55;
      font-size: 11px;
      margin-bottom: 4px;
    }


    .history-section-tags {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
    }


    .history-section-tag {
      padding: 3px 8px;
      border-radius: 999px;
      background: rgba(255,255,255,0.9);
      font-size: 11px;
    }


    .history-entry-id {
      margin-top: 8px;
      opacity: 0.35;
      font-size: 9px;
      word-break: break-all;
    }


    .visitor-history-loading,
    .visitor-history-empty,
    .visitor-history-error {
      text-align: center;
      padding: 30px 15px;
      opacity: 0.65;
    }


    .visitor-history-empty > div {
      font-size: 30px;
      margin-bottom: 5px;
    }


  `;




  document.head.appendChild(
    style
  );


})();




/* ============================================================
   START VISITOR HISTORY AFTER APP LOAD
   ============================================================ */


setTimeout(
  async () => {


    await startVisitorHistory();


    startVisitorHistoryUpdates();


  },
  500
);




/* ============================================================
   WATCH FOR ADMIN PRESENCE PANEL
   ============================================================ */


const visitorHistoryObserver =
  new MutationObserver(
    () => {


      if (isAdmin) {


        createVisitorHistoryButton();


      }


    }
  );




visitorHistoryObserver.observe(
  document.body,
  {
    childList: true,
    subtree: true
  }
);




setTimeout(
  () => {


    if (isAdmin) {


      createVisitorHistoryButton();


    }


  },
  1000
);
(function fixVisitorHistoryGrouping() {


  const originalLoadVisitorHistory =
    window.loadVisitorHistory;


  window.loadVisitorHistory = async function () {


    const content =
      document.getElementById(
        "visitorHistoryContent"
      );


    if (!content) return;


    content.innerHTML = `
      <div class="visitor-history-loading">
        loading history...
      </div>
    `;


    try {


      const myVisitorId =
        localStorage.getItem(
          "gallery_visitor_id"
        );


      const {
        data,
        error
      } =
        await supabaseClient
          .from("gallery_visit_history")
          .select("*")
          .order(
            "started_at",
            {
              ascending: false
            }
          );


      if (error) {


        console.error(
          "loadVisitorHistory:",
          error
        );


        content.innerHTML = `
          <div class="visitor-history-error">
            couldn't load visitor history ♡
          </div>
        `;


        return;
      }


      /*
        Hide ONLY your own visitor ID.


        Other logged-in visitors are still shown.
      */


      const otherVisits =
        (data || []).filter(
          visit =>
            visit.visitor_id !==
            myVisitorId
        );


      if (
        otherVisits.length === 0
      ) {


        content.innerHTML = `
          <div class="visitor-history-empty">
            <div>♡</div>
            <p>no other visits recorded yet</p>
          </div>
        `;


        return;
      }


      /*
        Group visits by visitor_id.
      */


      const grouped =
        new Map();


      otherVisits.forEach(
        visit => {


          if (
            !grouped.has(
              visit.visitor_id
            )
          ) {


            grouped.set(
              visit.visitor_id,
              []
            );


          }


          grouped
            .get(visit.visitor_id)
            .push(visit);


        }
      );




      content.innerHTML = "";




      let visitorNumber = 1;




      grouped.forEach(
        (
          visits,
          visitorId
        ) => {


          const visitorCard =
            document.createElement(
              "div"
            );


          visitorCard.className =
            "visitor-group";




          /*
            Newest visits first.
          */


          visits.sort(
            (
              a,
              b
            ) =>
              new Date(
                b.started_at
              ) -
              new Date(
                a.started_at
              )
          );




          const visitsHtml =
            visits
              .map(
                (
                  visit,
                  visitIndex
                ) => {


                  const started =
                    new Date(
                      visit.started_at
                    );




                  const dateText =
                    started.toLocaleDateString(
                      undefined,
                      {
                        month:
                          "short",


                        day:
                          "numeric",


                        year:
                          "numeric"
                      }
                    );




                  const timeText =
                    started.toLocaleTimeString(
                      undefined,
                      {
                        hour:
                          "numeric",


                        minute:
                          "2-digit"
                      }
                    );




                  const duration =
                    formatDuration(
                      visit.duration_seconds ||
                      0
                    );




                  const sectionNames =
                    (
                      visit.sections_visited ||
                      []
                    )
                      .map(
                        id =>
                          getSectionName(
                            id
                          )
                      )
                      .filter(Boolean);




                  const sectionsHtml =
                    sectionNames.length
                      ? sectionNames
                          .map(
                            name =>
                              `<span class="history-section-tag">
                                ${escapeHtml(
                                  name
                                )}
                              </span>`
                          )
                          .join("")
                      : `
                          <span class="history-section-tag">
                            all memories ♡
                          </span>
                        `;




                  return `


                    <div class="grouped-visit">


                      <div class="grouped-visit-top">


                        <strong>
                          Visit ${
                            visits.length -
                            visitIndex
                          }
                        </strong>


                        <span>
                          ${escapeHtml(
                            dateText
                          )}
                          ·
                          ${escapeHtml(
                            timeText
                          )}
                        </span>


                      </div>




                      <div class="history-entry-duration">


                        ⏱️


                        <strong>
                          ${escapeHtml(
                            duration
                          )}
                        </strong>


                      </div>




                      <div class="history-entry-sections">


                        <span class="history-label">
                          sections visited
                        </span>


                        <div class="history-section-tags">


                          ${sectionsHtml}


                        </div>


                      </div>


                    </div>


                  `;


                }
              )
              .join("");




          visitorCard.innerHTML = `


            <div class="visitor-group-header">


              <div>


                <strong>
                  Visitor ${visitorNumber}
                </strong>


                <span class="visitor-group-count">
                  ${visits.length}
                  ${
                    visits.length === 1
                      ? "visit"
                      : "visits"
                  }
                </span>


              </div>


              <div class="visitor-group-id">
                ${escapeHtml(
                  visitorId
                )}
              </div>


            </div>




            <div class="grouped-visits">


              ${visitsHtml}


            </div>


          `;




          content.appendChild(
            visitorCard
          );




          visitorNumber++;


        }
      );


    } catch (error) {


      console.error(
        "Grouped visitor history failed:",
        error
      );


      content.innerHTML = `
        <div class="visitor-history-error">
          couldn't load visitor history ♡
        </div>
      `;


    }


  };




  /*
    Extra styling for grouped visitors.
  */


  const style =
    document.createElement(
      "style"
    );




  style.textContent = `


    .visitor-group {
      border: 1px solid rgba(0,0,0,0.06);
      border-radius: 14px;
      overflow: hidden;
      background: rgba(255,255,255,0.7);
    }


    .visitor-group-header {
      padding: 13px 15px;
      background: rgba(255,255,255,0.85);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }


    .visitor-group-header > div:first-child {
      display: flex;
      align-items: center;
      gap: 8px;
    }


    .visitor-group-count {
      font-size: 11px;
      opacity: 0.5;
    }


    .visitor-group-id {
      margin-top: 4px;
      font-size: 9px;
      opacity: 0.35;
      word-break: break-all;
    }


    .grouped-visits {
      display: flex;
      flex-direction: column;
    }


    .grouped-visit {
      padding: 12px 15px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }


    .grouped-visit:last-child {
      border-bottom: 0;
    }


    .grouped-visit-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      flex-wrap: wrap;
    }


    .grouped-visit-top span {
      opacity: 0.55;
      font-size: 12px;
    }


  `;




  document.head.appendChild(
    style
  );


})();
/* ============================================================
   ADMIN BUTTON + ONLINE STATUS POSITIONING
   ============================================================ */


(function customizePresenceUI() {


  const style = document.createElement("style");


  style.textContent = `


    /* Make the online status bigger */
    .live-presence {
      font-size: 16px !important;
      line-height: 1.5;
    }


    .presence-main {
      font-size: 18px !important;
      font-weight: 500;
    }


    .presence-heart {
      font-size: 19px !important;
    }


    /* Move the admin visitor-history button
       to the upper-right corner */
    #visitorHistoryButton {
      position: fixed !important;
      top: 18px !important;
      right: 20px !important;
      z-index: 10000 !important;


      padding: 7px 11px !important;
      border-radius: 10px !important;


      background: rgba(255, 255, 255, 0.85) !important;
      backdrop-filter: blur(8px);


      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.08);


      font-size: 12px !important;
      opacity: 0.75;
    }


    #visitorHistoryButton:hover {
      opacity: 1;
    }


  `;


  document.head.appendChild(style);


})();
/* ============================================================
   MADS ONLINE / LAST SEEN
   ============================================================ */


(function initMadsStatus() {


  const ONLINE_TIMEOUT = 60000; // 1 minute


  function getMadsStatusElement() {


    let el = document.getElementById("madsOnlineStatus");


    if (!el) {
      el = document.createElement("div");
      el.id = "madsOnlineStatus";


      el.style.cssText = `
        font-size: 14px;
        line-height: 1.5;
      `;


      document.body.appendChild(el);
    }


    return el;
  }


  function formatLastSeen(date) {


    const seconds =
      Math.floor(
        (Date.now() - date.getTime()) / 1000
      );


    if (seconds < 60) {
      return "just now";
    }


    const minutes =
      Math.floor(seconds / 60);


    if (minutes < 60) {
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }


    const hours =
      Math.floor(minutes / 60);


    if (hours < 24) {
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }


    const days =
      Math.floor(hours / 24);


    return `${days} day${days === 1 ? "" : "s"} ago`;
  }


  async function updateMadsStatus() {


    try {


      if (typeof visitorId === "undefined") {
        console.warn("Mads status: visitorId not available yet.");
        return;
      }


      const { data, error } =
        await supabase
          .from("gallery_sessions")
          .select("last_seen")
          .eq("visitor_id", visitorId)
          .order("last_seen", {
            ascending: false
          })
          .limit(1)
          .maybeSingle();


      if (error) {
        console.error(
          "Mads status error:",
          error
        );
        return;
      }


      const display =
        getMadsStatusElement();


      if (!data || !data.last_seen) {


        display.innerHTML =
          `⚪ <strong>mads is offline</strong>`;


        return;
      }


      const lastSeen =
        new Date(data.last_seen);


      const isOnline =
        Date.now() -
        lastSeen.getTime() <
        ONLINE_TIMEOUT;


      if (isOnline) {


        display.innerHTML =
          `🟢 <strong>mads is online</strong>`;


      } else {


        display.innerHTML = `
          ⚪ <strong>mads is offline</strong><br>
          <span style="opacity:.7">
            last seen ${formatLastSeen(lastSeen)}
          </span>
        `;


      }


    } catch (error) {


      console.error(
        "Mads status error:",
        error
      );


    }


  }


  // Check immediately
  updateMadsStatus();


  // Keep the display updated
  setInterval(
    updateMadsStatus,
    15000
  );


})();
/* =========================================================
   ♡ LYSS ONLINE / LAST ACTIVE STATUS
   Paste this at the VERY BOTTOM of your JS file
   ========================================================= */


(function () {
  const LYSS_PRESENCE_ID = "lyss";


  // Change this if your admin page uses a different way
  // of identifying the admin session.
  const isAdminPage =
    window.location.pathname.toLowerCase().includes("admin");


  /* ---------- VISITOR DISPLAY ---------- */


  async function updateLyssStatusDisplay() {
    try {
      const { data, error } = await supabase
        .from("admin_presence")
        .select("last_seen")
        .eq("id", LYSS_PRESENCE_ID)
        .maybeSingle();


      if (error) {
        console.error("Lyss presence error:", error);
        return;
      }


      if (!data || !data.last_seen) return;


      const lastSeen = new Date(data.last_seen);
      const secondsAgo = Math.floor((Date.now() - lastSeen.getTime()) / 1000);


      // Consider Lyss online if her last heartbeat was
      // within the last 90 seconds.
      const isOnline = secondsAgo <= 90;


      let text = "";


      if (isOnline) {
        text = "♡ lyss is online";
      } else {
        const minutesAgo = Math.floor(secondsAgo / 60);


        if (minutesAgo < 1) {
          text = "lyss was last active just now";
        } else if (minutesAgo === 1) {
          text = "lyss was last active 1 minute ago";
        } else if (minutesAgo < 60) {
          text = `lyss was last active ${minutesAgo} minutes ago`;
        } else {
          const hoursAgo = Math.floor(minutesAgo / 60);


          if (hoursAgo === 1) {
            text = "lyss was last active 1 hour ago";
          } else if (hoursAgo < 24) {
            text = `lyss was last active ${hoursAgo} hours ago`;
          } else {
            const daysAgo = Math.floor(hoursAgo / 24);


            if (daysAgo === 1) {
              text = "lyss was last active 1 day ago";
            } else {
              text = `lyss was last active ${daysAgo} days ago`;
            }
          }
        }
      }


      let statusElement = document.getElementById("lyss-online-status");


      if (!statusElement) {
        statusElement = document.createElement("div");
        statusElement.id = "lyss-online-status";


        statusElement.style.cssText = `
          font-size: 13px;
          margin-top: 4px;
          opacity: 0.8;
        `;


        // Put it at the bottom of the page.
        document.body.appendChild(statusElement);
      }


      statusElement.textContent = text;


    } catch (err) {
      console.error("Could not update Lyss status:", err);
    }
  }




  /* ---------- ADMIN HEARTBEAT ---------- */


  async function sendLyssHeartbeat() {
    if (!isAdminPage) return;


    try {
      const now = new Date().toISOString();


      const { error } = await supabase
        .from("admin_presence")
        .upsert(
          {
            id: LYSS_PRESENCE_ID,
            last_seen: now
          },
          {
            onConflict: "id"
          }
        );


      if (error) {
        console.error("Lyss heartbeat error:", error);
      }


    } catch (err) {
      console.error("Lyss heartbeat failed:", err);
    }
  }




  /* ---------- START ---------- */


  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateLyssStatusDisplay();


      if (isAdminPage) {
        sendLyssHeartbeat();
      }
    });
  } else {
    updateLyssStatusDisplay();


    if (isAdminPage) {
      sendLyssHeartbeat();
    }
  }




  /* ---------- KEEP ADMIN ONLINE ---------- */


  setInterval(() => {
    if (isAdminPage) {
      sendLyssHeartbeat();
    }


    updateLyssStatusDisplay();
  }, 30000);


})();
