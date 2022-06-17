export default function createConfirmationCode() {
   const state = {
      observers: [],
      popupWrapper: document.querySelector('.popup-wrapper-confirmation-code')
   }

   function createForm(api) {
      const state = {
         confirmationForm: document.querySelector('form.confirmation-code-form'),
         inputs: [...document.querySelectorAll('form.confirmation-code-form input')],
         btnResendingEmailCode: document.querySelector('.popup-confirmation-code .btn-resending-email-code')
      }

      const sendEmailCode = async e => {
         e.preventDefault();
         
         const activationCode = state.inputs.reduce((acc, input) => acc += input.value, '');
         const activationToken = document.cookie.split('=')[1];
         const keepConnected = JSON.parse(localStorage.getItem('keepConnected'));

         try {
            const [data, status] = await api.request({
               method: 'POST',
               route: `checkEmailCode?activationToken=${activationToken}`,
               body: { activationCode, keepConnected }
            })
            
            if (status === 200) {
               notifyAll(data.userData);
            }
            
         } catch(e) {
            console.log(e);
         }
      }
      
      const resendEmailCode = async e => {
         if (e.type === 'touchstart') e.preventDefault();

         const userEmail = localStorage.getItem('sessionEmail');

         try {
            const [data, status] = await api.request({
               method: 'GET',
               route: `resendEmailCode?sessionEmail=${userEmail}`
            })

            if (status === 200) {
               document.cookie = `activationToken = ${data.userData.activationToken}; path=/`;
            }

         } catch(e) {
            console.log(e);
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
            if (e.key !== 'Backspace') return

            const input = e.target

            const shouldFocusOnInput = input.previousElementSibling && input.value === '';

            shouldFocusOnInput && focusOnInput(input.previousElementSibling);
         }
      }

      state.confirmationForm.addEventListener('submit', sendEmailCode);

      state.btnResendingEmailCode.addEventListener('click', resendEmailCode);
      state.btnResendingEmailCode.addEventListener('touchstart', resendEmailCode);
      
      state.confirmationForm.addEventListener('input', dispatch.shouldWriteOnInput);
      state.confirmationForm.addEventListener('keydown', dispatch.shouldDeletionOnInput);
      state.confirmationForm.addEventListener('click', dispatch.shouldFocusOnInput);
      state.confirmationForm.addEventListener('paste', dispatch.shouldPasteAll);

      return {  }
   }

   const subscribe = observerFunction => {
      state.observers.push(observerFunction);
   }

   const notifyAll = data => {
      for (const observerFunction of state.observers) {
         observerFunction(data);
      }
   }

   const resetpopup = () => {
      const form = state.popupWrapper.querySelector('form');
      const inputs = form.querySelectorAll('input[type="number"]');
   
      inputs.forEach(input => input.removeAttribute('value'));

      form.reset();
   }

   const showPopup = () => {
      state.popupWrapper.classList.add('show');
      resetpopup();
   }

   const hidePopup = () =>{
      state.popupWrapper.classList.remove('show');
   }

   const render = ({ api }) => {
      const template = `
         <div class="popup-overlay overlay-confirmation-code" data-action="shouldHidePopup">
            <div class="popup popup-confirmation-code">
               <div class="close">
                  <button class="close-popup-target close-popup center-flex" tabindex="0" data-action="shouldHidePopup">
                     <img class="close-popup-target close-popup" src="./images/close_popup_icon.svg" alt="Fechar popup">
                  </button>
               </div>
               <div class="title">
                  <div>
                     <h1>Confirmar E-mail</h1>
                  </div>
                  <div>
                     <p>
                        Para confirmar o seu cadastro, digite o código de confirmação enviado para o seu e-mail.
                     </p>
                  </div>
               </div>
               <div class="form">
                  <form class="confirmation-code-form">
                     <div class="container-inputs-code">
                        <input type="number" maxlength="1" name="inputCode" />
                        <input type="number" maxlength="1" name="inputCode" />
                        <input type="number" maxlength="1" name="inputCode" />
                        <input type="number" maxlength="1" name="inputCode" />
                        <input type="number" maxlength="1" name="inputCode" />
                     </div>
                     <div class="container-btn-code">
                        <button type="submit" class="btn-default btn-default-hover">Confirmar</button>
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

      createForm(api);
   }

   const dispath = {
      shouldHidePopup() {
         hidePopup();
      }
   }

   const wrapperListener = e => {
      const action = e.target.dataset.action;

      if (!dispath[action]) {
         return
      }

      if (e.type === 'touchstart') e.preventDefault();

      dispath[action]();
   }

   state.popupWrapper.addEventListener('mousedown', wrapperListener);
   state.popupWrapper.addEventListener('touchstart', wrapperListener);

   return {
      render,
      showPopup,
      subscribe
   }
}