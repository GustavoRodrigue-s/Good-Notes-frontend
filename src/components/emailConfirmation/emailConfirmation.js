export default function createEmailConfirmation() {
   const state = {
      observers: [],
      popupWrapper: document.querySelector('.popup-wrapper-email-confirmation')
   }

   function createForm({ api, cookie }) {
      const state = {
         emailConfirmationForm: document.querySelector('form.email-confirmation-form'),
         inputs: [...document.querySelectorAll('form.email-confirmation-form input')],
         btnResendEmailCode: document.querySelector('.popup-email-confirmation .btn-resending-email-code'),
         btnSendEmailCode: document.querySelector('form.email-confirmation-form .btn-send-email-code')
      }

      const showOrHideLoading = showOrHide => {
         state.btnSendEmailCode.classList[showOrHide]('loading');
         state.btnResendEmailCode.classList[showOrHide]('loading');
      }

      const handleErrors = {
         hideError() {
            state.emailConfirmationForm.classList.remove('error', 'input');
            state.emailConfirmationForm.querySelector('.container-email-code-error').classList.remove('show');
         },
         showError(message) {
            const containerError = state.emailConfirmationForm.querySelector('.container-email-code-error');
            const error = containerError.querySelector('span');

            const acceptedErrors = {
               "code incomplete"() {
                  error.innerText = 'Preencha todos os campos!';
                  state.emailConfirmationForm.classList.add('input');
               },
               'invalid code'() {
                  error.innerText = 'Código inválido!';
                  state.emailConfirmationForm.classList.add('input');
               },
               'no session email'() {
                  error.innerText = 'Erro! Faça o login novamente.';
               },
               'request error'() {
                  error.innerText = 'Houve um erro, tente novamente!';
               }
            }

            containerError.classList.add('show');
            state.emailConfirmationForm.classList.add('error');

            acceptedErrors[message] 
               ? acceptedErrors[message]() 
               : acceptedErrors['request error']();
         }
      }

      const handleSuccess = {
         hideSuccess() {
            state.emailConfirmationForm.classList.remove('success');
            state.emailConfirmationForm.querySelector('.container-email-code-success').classList.remove('show');
         },
         showSuccess() {
            const containerSuccess = state.emailConfirmationForm.querySelector('.container-email-code-success');

            containerSuccess.classList.add('show');
            state.emailConfirmationForm.classList.add('success');
         }
      }

      const getRequestData = () => {
         const emailConfirmationCode = state.inputs.reduce((acc, input) => acc += input.value, '');
         const emailConfirmationToken = cookie.getCookie('emailConfirmationToken');

         return { emailConfirmationCode, emailConfirmationToken }
      }

      const sendEmailCode = async ({ auth, endpoint, body }) => {
         const { emailConfirmationCode, emailConfirmationToken } = getRequestData();         

         try {
            const [data, status] = await api.request({
               auth,
               method: 'PUT',
               route: `${endpoint}?emailConfirmationToken=${emailConfirmationToken}`,
               body: { emailConfirmationCode, ...body }
            });

            showOrHideLoading('remove');

            if (status !== 200) {
               handleErrors.showError(data.reason);
               return
            }

            if (status === 200) {
               notifyAll('success', data);
               hidePopup();
            }

            cookie.deleteCookie('emailConfirmationToken');

         } catch(e) {
            showOrHideLoading('remove');
         } 
      }
      
      const resendEmailCode = async ({ auth, endpoint, body }) => {
         try {
            const [data, status] = await api.request({
               auth,
               method: 'PUT',
               route: endpoint,
               body
            })

            showOrHideLoading('remove');

            if (status !== 200) {
               handleErrors.showError(data.reason);
               return
            }

            cookie.setCookie('emailConfirmationToken', data.userData.emailConfirmationToken);
            handleSuccess.showSuccess();

         } catch(e) {
            showOrHideLoading('remove');
         }
      }

      const pasteAll = code => {
         state.inputs.forEach((input, index) => {
            input.value = code[index];
            input.setAttribute('value', code[index]);
         });
      }

      const focusOnEmptyInput = () => {
         const firstEmptyInput = state.inputs.find(input => input.value === '');

         firstEmptyInput.focus();
      }

      const resetInput = input => {
         input.value = input.getAttribute('value');
      }
      
      const focusOnInput = input => {
         input.focus();
      }

      const dispatch = {
         shouldPasteAll(e) {
            const code = e.clipboardData.getData('text');

            if (code.length !== 5 || !+code) {
               e.preventDefault();
               return
            }

            pasteAll(code);
         },
         shouldFocusOnInput(e) {
            if (e.target.tagName !== 'INPUT' || e.target.value) return

            focusOnEmptyInput();
         },
         shouldWriteOnInput(e) {
            const input = e.target;

            if (input.value.length > 1) {
               resetInput(input);

               return
            }

            input.setAttribute('value', input.value);

            const shouldFocusOnInput = input.nextElementSibling && input.value && !input.nextElementSibling.value;

            shouldFocusOnInput && focusOnInput(input.nextElementSibling);
         },
         shouldDeletionOnInput(e) {
            handleErrors.hideError();
            handleSuccess.hideSuccess();

            if (e.key !== 'Backspace') return

            const input = e.target

            const shouldFocusOnInput = input.previousElementSibling && input.value === '';

            shouldFocusOnInput && focusOnInput(input.previousElementSibling);
         }
      }

      const sendCodeListener = e => {
         e.preventDefault();

         showOrHideLoading('add');

         handleErrors.hideError();
         handleSuccess.hideSuccess();

         notifyAll('submit', sendEmailCode);
      }

      const resendCodeListener = e => {
         e.preventDefault();

         showOrHideLoading('add');

         handleErrors.hideError();
         handleSuccess.hideSuccess();

         notifyAll('resend', resendEmailCode);
      }

      state.emailConfirmationForm.addEventListener('submit', sendCodeListener);
      state.btnResendEmailCode.addEventListener('pointerup', resendCodeListener);

      state.emailConfirmationForm.addEventListener('input', dispatch.shouldWriteOnInput);
      state.emailConfirmationForm.addEventListener('keydown', dispatch.shouldDeletionOnInput);
      state.emailConfirmationForm.addEventListener('click', dispatch.shouldFocusOnInput);
      state.emailConfirmationForm.addEventListener('paste', dispatch.shouldPasteAll);
   }

   const subscribe = (event, listener) => {
      state.observers.push({ event, listener });
   }

   const notifyAll = (event, data) => {
      const listeners = state.observers.filter(observer => observer.event === event);

      for (const { listener } of listeners) {
         listener(data);
      }
   }

   const resetpopup = () => {
      const [error, success] = state.popupWrapper.querySelectorAll('.container-message');
      const form = state.popupWrapper.querySelector('form');
      const inputs = form.querySelectorAll('input[type="number"]');

      error.classList.remove('show')
      success.classList.remove('show');

      form.classList.remove('error', 'success', 'input');
   
      inputs.forEach(input => input.removeAttribute('value'));

      form.reset();
   }

   const setMessage = message => {
      const requestTitle = state.popupWrapper.querySelector('.title h1');
      const requestType = state.popupWrapper.querySelector('.title .request-type');

      const messages = {
         'activate account'() {
            requestTitle.innerText = 'Confirmar sua Conta';
            requestType.innerText = 'ativar a sua conta';
         },
         'reset password'() {
            requestTitle.innerText = 'Confirmar Nova Senha';
            requestType.innerText = 'redefinir sua senha';
         },
         'confirm email'() {
            requestTitle.innerText = 'Confirmar Novo E-mail';
            requestType.innerText = 'confirmar seu novo e-mail';
         }
      }

      messages[message] && messages[message]();
   }

   const showPopup = () => {
      resetpopup();
      state.popupWrapper.classList.add('show');
   }

   const hidePopup = () =>{
      state.popupWrapper.classList.remove('show');

      notifyAll('hidden popup')
      
      state.observers = [];
   }

   const render = someHooks => {
      const template = `
      <div class="popup-overlay overlay-email-confirmation">
         <div class="popup popup-email-confirmation">
            <div class="close">
               <button class="close-popup-target close-popup center-flex" tabindex="0" data-action="hide">
                  <img class="close-popup-target close-popup" src="./images/close_popup_icon.svg" alt="Fechar popup">
               </button>
            </div>
            <div class="title">
               <div>
                  <h1></h1>
               </div>
               <div>
                  <p class="subtitle">
                     Digite o código de confirmação enviado para o seu e-mail para <strong class="request-type"></strong>.
                  </p>
               </div>
            </div>
            <div class="form">
               <form class="email-confirmation-form">
                  <div class="container-inputs-code">
                     <input type="number" maxlength="1" name="inputCode" />
                     <input type="number" maxlength="1" name="inputCode" />
                     <input type="number" maxlength="1" name="inputCode" />
                     <input type="number" maxlength="1" name="inputCode" />
                     <input type="number" maxlength="1" name="inputCode" />
                  </div>
                  <div class="container-email-code-error container-message">
                     <svg fill="currentColor" width="16px" height="16px" viewBox="0 0 24 24" xmlns="https://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"></path>
                     </svg>
                     <span></span>
                  </div>
                  <div class="container-email-code-success container-message">
                     <svg stroke="currentColor" fill="currentColor" stroke-width="0" version="1" viewBox="0 0 48 48" enable-background="new 0 0 48 48" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
                        <circle fill="#4CAF50" cx="24" cy="24" r="21"></circle><polygon fill="#fff" points="34.6,14.6 21,28.2 15.4,22.6 12.6,25.4 21,33.8 37.4,17.4"></polygon>
                     </svg>
                     <span>O novo código foi enviado!</span>
                  </div>
                  <div class="container-btn-code">
                     <button type="submit" class="btn-default btn-default-hover btn-send-email-code">
                        Confirmar
                        <div class="container-btn-loading center-flex">
                           <div class="loading"></div>
                        </div>
                     </button>
                  </div>
               </form>
            </div>
            <div class="footer">
               <p>
                  Não recebeu o e-mail de confirmação?
                  <button type="button" class="btn-resending-email-code">Reenviar código de confirmação</button>
               </p>
            </div>
         </div>
      </div>
      `;

      state.popupWrapper.innerHTML = template;
 
      createForm(someHooks);
   }

   const acceptedPopupActions = {
      hide() {
         hidePopup();
      }
   }

   const wrapperListener = e => {
      const action = e.target.dataset.action;

      acceptedPopupActions[action]?.();
   }

   state.popupWrapper.addEventListener('pointerup', wrapperListener);

   return {
      render,
      showPopup,
      subscribe,
      setMessage
   }
}