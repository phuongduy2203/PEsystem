(function () {
    const SELECTORS = {
        ajaxForm: '[data-npi-form]',
        createForm: '[data-npi-form="create-project"]',
        uploadForm: '[data-npi-form="upload-document"]',
        deleteForm: '[data-npi-form="delete-document"]',
        navLinks: '[data-npi-link]'
    };

    document.addEventListener('DOMContentLoaded', () => {
        setupAjaxForms();
        setupNavigationFeedback();
    });

    function setupAjaxForms() {
        const forms = document.querySelectorAll(SELECTORS.ajaxForm);
        forms.forEach(form => {
            if (form.dataset.npiAjaxBound === 'true') {
                return;
            }

            const type = form.dataset.npiForm;
            const options = buildOptions(type, form);

            if (!options) {
                return;
            }

            form.addEventListener('submit', event => handleSubmit(event, form, options));
            form.dataset.npiAjaxBound = 'true';
        });
    }

    function buildOptions(type, form) {
        switch (type) {
            case 'create-project':
                return {
                    onSuccess: data => redirectOrReload(data),
                    onValidation: errors => ensureModalVisible('createProjectModal'),
                    errorMessage: 'Không thể tạo project. Vui lòng thử lại.',
                    busyText: 'Đang tạo...'
                };
            case 'upload-document':
                return {
                    onSuccess: data => redirectOrReload(data),
                    onValidation: () => { /* nothing */ },
                    errorMessage: 'Không thể tải tài liệu lên. Vui lòng thử lại.',
                    busyText: 'Đang tải...'
                };
            case 'delete-document':
                return {
                    beforeSubmit: () => confirmDeletion(form),
                    onSuccess: data => redirectOrReload(data),
                    errorMessage: 'Không thể xoá tài liệu. Vui lòng thử lại.',
                    busyText: 'Đang xoá...'
                };
            default:
                return null;
        }
    }

    async function handleSubmit(event, form, options) {
        if (form.dataset.npiAjaxDisabled === 'true') {
            return;
        }

        if (options.beforeSubmit && options.beforeSubmit() === false) {
            event.preventDefault();
            return;
        }

        event.preventDefault();
        clearValidationErrors(form);
        toggleSubmitState(form, true, options.busyText);
        showSpinnerSafe();

        try {
            const response = await fetch(form.action, {
                method: (form.method || 'post').toUpperCase(),
                body: new FormData(form),
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await parseJsonSafe(response);

            if (response.ok) {
                if (options.onSuccess) {
                    options.onSuccess(data);
                }
                return;
            }

            if (response.status === 400 && data && data.errors) {
                applyValidationErrors(form, data.errors);
                if (options.onValidation) {
                    options.onValidation(data.errors);
                }
                return;
            }

            handleErrorResponse(data, options.errorMessage);
        } catch (error) {
            console.error('NPI AJAX submission failed. Falling back to standard post.', error);
            form.dataset.npiAjaxDisabled = 'true';
            setTimeout(() => form.submit(), 0);
        } finally {
            hideSpinnerSafe();
            toggleSubmitState(form, false);
        }
    }

    function confirmDeletion(form) {
        const message = form.dataset.confirmMessage || 'Bạn có chắc chắn muốn xoá tài liệu này?';
        return window.confirm(message);
    }

    function redirectOrReload(payload) {
        if (payload && payload.redirectUrl) {
            window.location.href = payload.redirectUrl;
        } else {
            window.location.reload();
        }
    }

    function parseJsonSafe(response) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return response.json();
        }
        return Promise.resolve({});
    }

    function applyValidationErrors(form, errors) {
        Object.keys(errors).forEach(key => {
            const messages = errors[key];
            if (!Array.isArray(messages) || messages.length === 0) {
                return;
            }

            const field = findField(form, key);
            const message = messages[0];

            if (field) {
                field.classList.add('is-invalid');
            }

            const span = form.querySelector(`[data-valmsg-for="${CSS.escape(key)}"]`);
            if (span) {
                span.classList.remove('field-validation-valid');
                span.classList.add('field-validation-error');
                span.textContent = message;
            }
        });
    }

    function clearValidationErrors(form) {
        const invalidInputs = form.querySelectorAll('.is-invalid');
        invalidInputs.forEach(input => input.classList.remove('is-invalid'));

        const validationSpans = form.querySelectorAll('[data-valmsg-for]');
        validationSpans.forEach(span => {
            span.classList.add('field-validation-valid');
            span.classList.remove('field-validation-error');
            span.textContent = '';
        });
    }

    function findField(form, key) {
        const name = key.replace(/^CreateProject\./, '').replace(/^model\./i, '');
        return form.querySelector(`[name="${CSS.escape(name)}"]`);
    }

    function toggleSubmitState(form, isBusy, busyText) {
        const submit = form.querySelector('[type="submit"]');
        if (!submit) {
            return;
        }

        if (isBusy) {
            submit.disabled = true;
            submit.dataset.originalText = submit.textContent;
            if (busyText) {
                submit.textContent = busyText;
            }
        } else {
            submit.disabled = false;
            if (submit.dataset.originalText) {
                submit.textContent = submit.dataset.originalText;
                delete submit.dataset.originalText;
            }
        }
    }

    function ensureModalVisible(modalId) {
        const modalElement = document.getElementById(modalId);
        if (!modalElement) {
            return;
        }

        const modalInstance = bootstrap.Modal.getOrCreateInstance(modalElement);
        modalInstance.show();
    }

    function handleErrorResponse(data, fallbackMessage) {
        const message = (data && (data.error || data.message)) || fallbackMessage || 'Đã xảy ra lỗi không xác định.';
        if (typeof showError === 'function') {
            showError(message);
        } else {
            alert(message);
        }
    }

    function setupNavigationFeedback() {
        const links = document.querySelectorAll(SELECTORS.navLinks);
        links.forEach(link => {
            link.addEventListener('click', () => {
                showSpinnerSafe();
            });
        });
    }

    function showSpinnerSafe() {
        if (typeof showSpinner === 'function') {
            showSpinner();
        }
    }

    function hideSpinnerSafe() {
        if (typeof hideSpinner === 'function') {
            hideSpinner();
        }
    }
})();
