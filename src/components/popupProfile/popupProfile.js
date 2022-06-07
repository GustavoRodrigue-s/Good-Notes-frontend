function createPopupProfile() {
   const state = {
      popupWrapper: document.querySelector('.popup-wrapper-profile')
   }

   function createForms({ api }) {
      const state = {
         credentialsForm: document.querySelector('.edit-profile-form'),
         formPhoto: document.querySelector('.profile-photo-form'),
         loading: document.querySelector('.popup-profile .container-loading')
      }

      const MAXIMUM_PHOTO_SIZE = 1 * 1024 * 1024; // 1MB

      const handleErrors = {
         showPhotoError(message) {
            const containerError = document.querySelector('.container-photo-error');
            const spanError = containerError.querySelector('span');

            const acceptedErrors = {
               "maximum photo size"() {
                  spanError.innerText = 'Esta foto é maior que 1MB.';
               },
               "image type not allowed"() {
                  spanError.innerText = 'Formato não permitido.';
               },
               "request error"() {
                  spanError.innerText = 'Houve um erro, tente novamente mais tarde!';
               }
            }

            containerError.classList.add('show');

            acceptedErrors[message]
               ? acceptedErrors[message]()
               : acceptedErrors['request error'];
         },
         showCredentialsError(errors) {
            const hideError = (input, containerInput) => {
               input.addEventListener('keypress', () => 
                  containerInput.classList.remove('error'));
            }

            const showError = (input, message) => {
               const containerInput = input.parentElement.parentElement;
               const span = containerInput.querySelector('.container-error > span');

               span.innerText = "" || message;

               containerInput.classList.add('error');

               hideError(input, containerInput);
            }

            const acceptedErrors = {
               "empty input"({ input }) {
                  showError(state.credentialsForm[input], 'Preencha este campo!');
               },
               "email already exists"({ input }) {
                  showError(state.credentialsForm[input], 'Este email já existe!');
               },
               "username already exists"({ input }) {
                  showError(state.credentialsForm[input], 'Este nome já existe!');
               },
               "request error"() {
                  const errorMessage = state.credentialsForm.querySelector('.container-credentials-error');
                  errorMessage.classList.add('show');
               }
            }
   
            errors.forEach(data => {
               acceptedErrors[data.reason]
                  ? acceptedErrors[data.reason](data)
                  : acceptedErrors['request error']();
            });
         }
      }
      const handleSuccess = {
         showPhotoSuccess() {
            const containerSuccess = document.querySelector('.container-photo-success');
            containerSuccess.classList.add('show');
         },
         showCredentialsSuccess() {
            const successMessage = state.credentialsForm.querySelector('.container-credentials-success');
            successMessage.classList.add('show');
         }
      }

      const toggleLoading = () => {
         state.loading.classList.toggle('show');
      }

      const readFileAsDataUrl = (file, callback) => {
         const reader = new FileReader();

         reader.addEventListener('load', () => callback(reader.result));

         reader.readAsDataURL(file);
      }

      const setProfileData = ({ email, username, photo }) => {
         const { inputEmail, inputUsername } = state.credentialsForm;
         const preview = state.formPhoto.querySelector('.photoPreview');

         inputEmail.setAttribute('value', email);
         inputUsername.setAttribute('value', username);
         
         if (photo) {
            preview.setAttribute('src', photo);
         }

         inputEmail.value = email;
         inputUsername.value = username;
      }

      const setSavedProfileData = () => {
         const credentials = JSON.parse(sessionStorage.getItem('profileData'));

         setProfileData(credentials);
      }

      const saveProfileDatas = ({ username, email, photo }) => {
         sessionStorage.setItem('profileData',
            JSON.stringify({ username, email, photo }) 
         ); 

         setProfileData({ username, email, photo });
      }

      const saveProfilePhoto = photoUrl => {
         const profileData = JSON.parse(sessionStorage.getItem('profileData'));
         profileData.photo = photoUrl;

         sessionStorage.setItem('profileData', JSON.stringify(profileData));
      }

      const getProfileData = async () => {
         try {
            toggleLoading();

            const [data, status] = await api.request({ auth: true, route: "getProfile" });

            if (status !== 200) {
               throw 'The tokens is not valid.';
            }

            saveProfileDatas(data);
            toggleLoading();

         }catch(e) {
            toggleLoading();
            handleErrors.showCredentialsError([{ reason: 'request error' }]);
         }
      }

      const updateCredentials = async newCredentials => {
         try {
            toggleLoading();
   
            const [data, status] = await api.request({ 
               auth: true,
               method: "POST",
               route: "updateCredentials",
               body: newCredentials 
            });

            toggleLoading();
   
            if (status !== 200) {
               handleErrors.showCredentialsError(data.reason);
               return
            }

            saveProfileDatas(data.newDatas);
            handleSuccess.showCredentialsSuccess();
   
         }catch(e) {
            toggleLoading();
            handleErrors.showCredentialsError([{ reason: 'request error' }]);
         }
      }

      const uploadPhoto = async fileData => {
         toggleLoading();

         try {
            const [data, status] = await api.request({ 
               auth: true,
               method: 'POST',
               route: 'uploadPhoto',
               body: fileData
            });

            toggleLoading();

            if (status !== 200) {
               handleErrors.showPhotoError(data.reason);
               return
            }

            saveProfilePhoto(fileData.photo);

            handleSuccess.showPhotoSuccess();

         } catch (e) {
            handleErrors.showPhotoError('request error');
         }
      }

      const handlePreviewChange = e => {
         const preview = state.formPhoto.querySelector('.photoPreview');

         if (!e.target.value) {
            return
         }

         document.querySelector('.container-photo-error').classList.remove('show');
         document.querySelector('.container-photo-success').classList.remove('show');

         readFileAsDataUrl(e.target.files[0], photoUrl => 
            preview.setAttribute('src', photoUrl)); 
      }

      const dispatch = {
         shouldRequestCredentials() {
            sessionStorage.getItem('profileData')
               ? setSavedProfileData()
               : getProfileData();
         },
         shouldUpdateCredentials(e) {
            e.preventDefault();
   
            const { inputUsername, inputEmail } = state.credentialsForm;
   
            const newCredentials = {
               email: inputEmail.value.trim(),
               username: inputUsername.value.trim()
            };
            
            const lastCredentials = JSON.parse(sessionStorage.getItem('profileData'));
   
            const keysOfNewCredentials = Object.keys(newCredentials);
   
            const shouldUpdate = keysOfNewCredentials.every(key => lastCredentials[key] === newCredentials[key]);
   
            if (!shouldUpdate) {
               updateCredentials(newCredentials);
            }
         },
         shouldUploadPhoto(e) {
            e.preventDefault();

            const { inputPhoto } = state.formPhoto;
            const { photo } = JSON.parse(sessionStorage.getItem('profileData'));

            if (!inputPhoto.value) {
               return
            }

            const file = inputPhoto.files[0];
            const { size, type, name } = file;

            const photoFormated = { size, type, name };

            if (photoFormated.size > MAXIMUM_PHOTO_SIZE) {
               handleErrors.showPhotoError('maximum photo size');
               return
            }

            readFileAsDataUrl(file, photoUrl => {
               if (photo === photoUrl) return

               photoFormated.photo = photoUrl;
               uploadPhoto(photoFormated);
            });
         }
      }

      state.credentialsForm.addEventListener('submit', dispatch.shouldUpdateCredentials);
      state.formPhoto.addEventListener('submit', dispatch.shouldUploadPhoto);
      state.formPhoto.inputPhoto.addEventListener('change', handlePreviewChange);

      return { 
         shouldRequestCredentials: dispatch.shouldRequestCredentials,
         toggleLoading
      }
   }

   function createPopup(forms, popupDeletion) {
      const state = {
         popupWrapper: document.querySelector('.popup-wrapper-profile'),
         btnShowPopup: document.querySelector('header .user-edit'),
         avalibleToOpen: true,
         show: false
      }

      const hidePopup = () => {
         const [overlayDeletion, overlayProfile] = state.popupWrapper.querySelectorAll('.popup-overlay');
         
         overlayProfile.classList.remove('show');
         setTimeout(() => overlayDeletion.classList.add('show'), 300);

         popupDeletion.resetPopup();
      }

      const showPopup = () => {
         const overlayProfile = state.popupWrapper.querySelector('.overlay-profile');
         overlayProfile.classList.add('show');
      }

      const resetPopup = () => {
         const [overlayDeletion, overlayProfile] = state.popupWrapper.querySelectorAll('.popup-overlay');
         const inutWithMessage = state.popupWrapper.querySelectorAll('.input-and-message.error');
         const messages = state.popupWrapper.querySelectorAll('.container-message.show');

         overlayProfile.classList.remove('show');
         overlayDeletion.classList.remove('show');

         inutWithMessage.forEach(container => container.classList.remove('error'));
         messages.forEach(message => message.classList.remove('show'));
      }

      const setAccessibilityProps = () => {
         state.show = !state.show;

         state.btnShowPopup.setAttribute('aria-expanded', state.show);

         state.btnShowPopup.setAttribute(
            'aria-label', 
            state.show ? 'Fechar popup de editar perfil' : 'Abrir popup de editar perfil'
         );
      }

      const setTimeToOpen = () => {
         state.avalibleToOpen = false;

         if (!state.avalibleToOpen) {
            setTimeout(() => state.avalibleToOpen = true, 650);
         }
      }

      const showAndHidePopupWrapper = () => {
         resetPopup();

         setTimeToOpen();
         setAccessibilityProps();

         state.popupWrapper.classList.toggle('show');
         
         if (state.popupWrapper.classList.contains('show')) {
            showPopup();
         } 
      }

      const dispatch = {
         shouldShowOrHidePopupWrapper(targetClass) {
            if(!state.avalibleToOpen) return

            const listOfElementsToToggle = ['close-popup-target', 'popup-overlay', 'user-edit'];
            const shouldToggle = listOfElementsToToggle.includes(targetClass);

            if (shouldToggle) {
               showAndHidePopupWrapper();
               forms.shouldRequestCredentials();
            }
         },
         shouldHidePopup(targetClass) {
            const listToShowPopupDeletion = ['btn-delete'];
            const shouldShowPopup = listToShowPopupDeletion.includes(targetClass);

            shouldShowPopup && hidePopup();
         }
      }

      const popupListener = e => {
         if (e.type === 'touchstart') e.preventDefault();

         const targetClass = e.target.classList[0];

         dispatch.shouldShowOrHidePopupWrapper(targetClass);
         dispatch.shouldHidePopup(targetClass);
      }

      state.popupWrapper.addEventListener('mousedown', popupListener);
      state.btnShowPopup.addEventListener('click', popupListener);
      state.btnShowPopup.addEventListener('touchstart', popupListener);

      return {  }
   }

   function createPopupConfirmDeletion({ api, cookie, toggleLoading }) {
      const state = {
         popupWrapper: document.querySelector('.popup-wrapper-profile'),
         confirmDeletionForm: document.querySelector('.deletion-account-form'),
         popup: document.querySelector('.popup-confirm-to-delete-account')
      }
   
      const resetPopup = () => {
         const { btnConfirm } = state.confirmDeletionForm;
   
         state.confirmDeletionForm.reset();
         btnConfirm.classList.remove('btn-delete-confirm-active');
      }
   
      const hidePopup = () => {
         const [overlayDeletion, overlayProfile] = state.popupWrapper.querySelectorAll('.popup-overlay');
         
         overlayDeletion.classList.remove('show');
         setTimeout(() => overlayProfile.classList.add('show'), 300);
   
         resetPopup();
      }
   
      const confirmAccountDeletion = async () => {
         hidePopup();
            
         try {
            toggleLoading();
   
            await api.request({ auth: true, method: 'DELETE', route: "deleteAccount" });
   
            cookie.deleteCookies();
            window.open('./index.html', '_self');
   
         } catch(e) {
            toggleLoading();
         }
      }
   
      const dispatch = {
         shouldHidePopup(targetClass) {
            const listToHidePopup = ['close-sub-popup-target'];
            const shouldToHide = listToHidePopup.includes(targetClass);
   
            shouldToHide && hidePopup();
         },
         shouldActiveTheButton() {
            const { username } = JSON.parse(sessionStorage.getItem('profileData'));
            const { inputUsername, btnConfirm } = state.confirmDeletionForm; 
   
            const addOrRemove = username === inputUsername.value ? 'add' : 'remove';
   
            btnConfirm.classList[addOrRemove]('btn-delete-confirm-active');
         },
         shouldConfirmDeletion(e) {
            e.preventDefault();
   
            const { btnConfirm } = state.confirmDeletionForm;
   
            const shouldDeleteAccount = btnConfirm.classList.contains('btn-delete-confirm-active');
   
            if (shouldDeleteAccount) {
               confirmAccountDeletion();
            }
         }
      } 
   
      const popupListener = e => {
         if (e.type === 'touchstart') e.preventDefault();
   
         const targetClass = e.target.classList[0];
   
         dispatch.shouldHidePopup(targetClass);
      }
   
      state.popup.addEventListener('click', popupListener);
   
      state.confirmDeletionForm.inputUsername.addEventListener('input', dispatch.shouldActiveTheButton);
      state.confirmDeletionForm.addEventListener('submit', dispatch.shouldConfirmDeletion);
   
      return { 
         resetPopup
      }
   }

   const render = someHooks => {
      const template = `
      <div class="popup-overlay overlay-confirm-delete">
         <div class="popup-confirm-to-delete-account popup">
            <div class="close">
               <button class="close-sub-popup-target close-popup center-flex" tabindex="0">
                  <img class="close-sub-popup-target close-popup" src="./images/close_popup_icon.svg" alt="Fechar popup">
               </button>
            </div>
            <div class="popup-content">
               <div class="header">
                  <h1>Excluir conta</h1>
               </div>
               <div class="body">
                  <div class="texts">
                     <p>
                        A exclusão da conta é irreversível, seus dados e notas serão completamente apagados. Ao excluir sua conta, você será redirecionado para a página principal.
                     </p>
                     <p>
                        Tem certeza que deseja excluir sua conta? Para confirmar digite o seu (<strong>Nome de usuário</strong>) abaixo.
                     </p>
                  </div>
                  <div class="controls">
                     <form class="deletion-account-form">
                        <div class="container-input">
                           <input type="text" name="inputUsername" class="input-confirm-delete input-default" autocomplete="off">
                        </div>
                        <div class="buttons">
                           <button type="reset" class="close-sub-popup-target btn-default btn-cancel-confirm">Cancelar</button>
                           <button type="submit" name="btnConfirm" class="btn-delete-confirm btn-default">Excluir Conta</button>
                        </div>
                     </form>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div class="popup-overlay overlay-profile">
         <div class="popup-profile popup">
            <div class="close">
               <button class="close-popup-target close-popup center-flex" tabindex="0">
                  <img class="close-popup-target close-popup" src="./images/close_popup_icon.svg" alt="Fechar popup">
               </button>
            </div>
            <div class="container-loading center-flex">
               <div></div>
            </div>
            <div class="popup-title">
               <h1>Configurações da conta</h1>
            </div>
            <div class="popup-edit-photo">
               <form class="profile-photo-form">
                  <div class="container-photo">
                     <input type="file" name="inputFile" class="inputPhoto" id="inputPhoto" />
                     <label for="inputPhoto" title="Selecionar foto">
                        <img class="photoPreview" src="./images/avatar_icon.svg" alt="avatar icon" />
                     </label>
                  </div>
                  <div class="container-photo-contents">
                     <div class="photo-texts">
                        <div class="title-photo">
                           <h1>Foto de perfil</h1>
                        </div>
                        <div class="paragraph-photo">
                           <p>Arquivo aceito do tipo .png, .jpg e .jpeg até 1MB.</p>
                        </div>
                     </div>
                     <div class="button-photo">
                        <button type="submit" class="btn-submit btn-default">Enviar</button>
                     </div>
                  </div>
               </form>
               <div class="container-photo-error container-message">
                  <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                  </svg>
                  <span></span>
               </div>
               <div class="container-photo-success container-message">
                  <svg stroke="currentColor" fill="currentColor" stroke-width="0" version="1" viewBox="0 0 48 48" enable-background="new 0 0 48 48" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                     <circle fill="#4CAF50" cx="24" cy="24" r="21"></circle><polygon fill="#fff" points="34.6,14.6 21,28.2 15.4,22.6 12.6,25.4 21,33.8 37.4,17.4"></polygon>
                  </svg>
                  Tudo certo! Sua foto foi atualizada.
               </div>
            </div>
            <div class="popup-credentials">
               <form class="edit-profile-form">
                  <div class="input-and-message">
                     <div class="container-input">
                        <label for="input-username">Nome de usuário</label>
                        <input type="text" class="input-username input-default" id="input-username" value="" name="inputUsername" autocomplete="off">
                     </div>
                     <div class="container-error">
                        <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg">
                           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                        </svg>
                        <span></span>
                     </div>
                  </div>
                  <div class="input-and-message">
                     <div class="container-input">
                        <label for="input-email">Endereço de email</label>
                        <input type="email" class="input-email input-default" id="input-email" value="" name="inputEmail" autocomplete="off">  
                     </div>
                     <div class="container-error">
                        <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg">
                           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                        </svg>
                        <span></span>
                     </div>
                  </div>
                  <div class="container-messages">
                     <div class="container-credentials-success container-message">
                        <svg stroke="currentColor" fill="currentColor" stroke-width="0" version="1" viewBox="0 0 48 48" enable-background="new 0 0 48 48" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                           <circle fill="#4CAF50" cx="24" cy="24" r="21"></circle><polygon fill="#fff" points="34.6,14.6 21,28.2 15.4,22.6 12.6,25.4 21,33.8 37.4,17.4"></polygon>
                        </svg>
                        Tudo certo! Seus dados foram atualizados.
                     </div>
                     <div class="container-credentials-error container-message">
                        <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg">
                           <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z">
                           </path>
                        </svg> 
                        Houve um erro, tente novamente mais tarde!
                     </div>
                  </div>
                  <div class="container-buttons">
                     <button type="submit" class="btn-update-credentials btn-default btn-default-hover">Salvar</button>
                     <button type="reset" class="btn-cancel btn-default">Cancelar</button>
                  </div>
               </form>
            </div>
            <div class="popup-disable-account">
               <div class="container-texts-popup">
                  <h1>Desative sua conta</h1>
                  <p>Informações sobre a sua conta serão apagadas.</p>
               </div>
               <div class="container-button-disable">
                  <button class="btn-delete btn-default">Desativar</button>
               </div>
            </div>
         </div>
      </div>
      ` ;

      state.popupWrapper.innerHTML = template;

      const forms = createForms(someHooks);
      const popupDeletion = createPopupConfirmDeletion({ ...someHooks, ...forms });

      createPopup(forms, popupDeletion);
   }

   return { 
      render
   }
} 

export default createPopupProfile;