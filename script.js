document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.page || 'inicio';
    const formatNumber = (value) => new Intl.NumberFormat('pt-BR').format(value);

    const analyticsKey = 'powerfit_analytics_v3';
    const todayKey = new Date().toISOString().slice(0, 10);
    const defaultState = {
        totalVisits: 0,
        instagram: 0,
        facebook: 0,
        youtube: 0,
        whatsapp: 0,
        ai: 0,
        daily: {}
    };

    let analyticsState = { ...defaultState };

    try {
        const stored = localStorage.getItem(analyticsKey);
        if (stored) {
            analyticsState = { ...defaultState, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.warn('Analytics storage unavailable:', error);
    }

    analyticsState.daily = analyticsState.daily && typeof analyticsState.daily === 'object'
        ? analyticsState.daily
        : {};

    function getDailyMetrics() {
        if (!analyticsState.daily[todayKey] || typeof analyticsState.daily[todayKey] !== 'object') {
            analyticsState.daily[todayKey] = {
                site: 0,
                instagram: 0,
                facebook: 0,
                youtube: 0,
                whatsapp: 0,
                ai: 0
            };
        }

        return analyticsState.daily[todayKey];
    }

    const sessionKey = 'powerfit_session_visit';
    const hasSessionVisit = sessionStorage.getItem(sessionKey);
    if (!hasSessionVisit && page !== 'admin') {
        analyticsState.totalVisits += 1;
        getDailyMetrics().site += 1;
        sessionStorage.setItem(sessionKey, 'yes');
    }

    try {
        localStorage.setItem(analyticsKey, JSON.stringify(analyticsState));
    } catch (error) {
        console.warn('Could not persist analytics:', error);
    }

    document.querySelectorAll('[data-social-count]').forEach((badge) => {
        const key = badge.dataset.socialCount;
        if (analyticsState[key] !== undefined) {
            badge.textContent = formatNumber(analyticsState[key]);
        }
    });

    document.querySelectorAll('[data-social-count]').forEach((button) => {
        button.closest('a, button')?.addEventListener('click', () => {
            const key = button.dataset.socialCount;
            if (analyticsState[key] === undefined) return;

            analyticsState[key] += 1;
            const dailyMetrics = getDailyMetrics();
            dailyMetrics[key] = Number(dailyMetrics[key]) || 0;
            dailyMetrics[key] += 1;
            localStorage.setItem(analyticsKey, JSON.stringify(analyticsState));
        });
    });

    const adminLogin = document.getElementById('admin-login');
    const adminAccessForm = document.getElementById('admin-access-form');
    const adminDashboard = document.getElementById('admin-dashboard');
    const adminLogout = document.getElementById('admin-logout');
    const adminStatus = document.getElementById('admin-status');
    const adminSessionKey = 'powerfit_admin_session';

    function drawAnalyticsChart() {
        const canvas = document.getElementById('analytics-chart');
        if (!canvas) return;

        const context = canvas.getContext('2d');
        const width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
        const height = canvas.height = 300 * window.devicePixelRatio;
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        const chartWidth = canvas.clientWidth;
        const chartHeight = 300;
        const days = Object.keys(analyticsState.daily).sort().slice(-14);
        const labels = days.length ? days : [todayKey];
        const series = [
            { key: 'site', label: 'Site', color: '#111111' },
            { key: 'instagram', label: 'Instagram', color: '#dd2a7b' },
            { key: 'facebook', label: 'Facebook', color: '#1877f2' },
            { key: 'youtube', label: 'YouTube', color: '#e53935' },
            { key: 'whatsapp', label: 'WhatsApp', color: '#1faa57' },
            { key: 'ai', label: 'IA', color: '#0d9488' }
        ];
        const values = series.flatMap((item) => labels.map((day) => analyticsState.daily[day]?.[item.key] || 0));
        const maximum = Math.max(...values, 1);
        const padding = { top: 28, right: 18, bottom: 42, left: 42 };
        const plotWidth = chartWidth - padding.left - padding.right;
        const plotHeight = chartHeight - padding.top - padding.bottom;

        context.clearRect(0, 0, chartWidth, chartHeight);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, chartWidth, chartHeight);
        context.strokeStyle = '#e5e7eb';
        context.fillStyle = '#6b7280';
        context.font = '12px Segoe UI';

        for (let line = 0; line <= 4; line += 1) {
            const y = padding.top + (plotHeight / 4) * line;
            context.beginPath();
            context.moveTo(padding.left, y);
            context.lineTo(chartWidth - padding.right, y);
            context.stroke();
            context.fillText(String(Math.round(maximum - (maximum / 4) * line)), 8, y + 4);
        }

        labels.forEach((day, index) => {
            const x = padding.left + (labels.length === 1 ? plotWidth / 2 : (plotWidth / (labels.length - 1)) * index);
            context.fillText(day.slice(5).split('-').reverse().join('/'), x - 16, chartHeight - 15);
        });

        series.forEach((item) => {
            context.strokeStyle = item.color;
            context.lineWidth = 2.5;
            context.beginPath();
            labels.forEach((day, index) => {
                const value = analyticsState.daily[day]?.[item.key] || 0;
                const x = padding.left + (labels.length === 1 ? plotWidth / 2 : (plotWidth / (labels.length - 1)) * index);
                const y = padding.top + plotHeight - (value / maximum) * plotHeight;
                if (index === 0) context.moveTo(x, y);
                else context.lineTo(x, y);
            });
            context.stroke();
        });

        document.querySelectorAll('[data-admin-total]').forEach((element) => {
            const key = element.dataset.adminTotal;
            element.textContent = formatNumber(analyticsState[key] || 0);
        });
    }

    function showAdminDashboard() {
        adminLogin?.classList.add('is-hidden');
        adminDashboard?.classList.remove('is-hidden');
        drawAnalyticsChart();
    }

    if (sessionStorage.getItem(adminSessionKey) === 'authorized') showAdminDashboard();

    adminAccessForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        const password = document.getElementById('admin-password').value;
        if (password !== 'powerfit-admin') {
            adminStatus.textContent = 'Senha incorreta.';
            adminStatus.className = 'form-status error';
            return;
        }
        sessionStorage.setItem(adminSessionKey, 'authorized');
        adminStatus.textContent = 'Acesso autorizado.';
        adminStatus.className = 'form-status success';
        showAdminDashboard();
    });

    adminLogout?.addEventListener('click', () => {
        sessionStorage.removeItem(adminSessionKey);
        adminDashboard?.classList.add('is-hidden');
        adminLogin?.classList.remove('is-hidden');
        adminAccessForm?.reset();
    });

    window.addEventListener('resize', drawAnalyticsChart);

    const galleryKey = 'powerfit_gallery_v1';
    const questionsKey = 'powerfit_questions_v1';

    function readCollection(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : [];
        } catch (error) {
            return [];
        }
    }

    function saveCollection(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function renderPublicGallery() {
        const gallery = document.getElementById('results-gallery');
        if (!gallery) return;

        gallery.querySelectorAll('[data-uploaded-photo]').forEach((photo) => photo.remove());
        readCollection(galleryKey).forEach((photo) => {
            const figure = document.createElement('figure');
            figure.className = 'result-photo';
            figure.dataset.uploadedPhoto = photo.id;
            const image = document.createElement('img');
            image.src = photo.src;
            image.alt = photo.alt || 'Resultado de aluno Power Fit';
            const caption = document.createElement('figcaption');
            caption.textContent = photo.caption || 'Resultado Power Fit';
            figure.append(image, caption);
            gallery.appendChild(figure);
        });
    }

    function renderAdminGallery() {
        const list = document.getElementById('admin-gallery-list');
        if (!list) return;

        list.replaceChildren();
        readCollection(galleryKey).forEach((photo) => {
            const item = document.createElement('div');
            item.className = 'admin-gallery-item';
            const image = document.createElement('img');
            image.src = photo.src;
            image.alt = photo.alt || 'Foto enviada';
            const details = document.createElement('div');
            const title = document.createElement('strong');
            title.textContent = photo.caption || 'Resultado Power Fit';
            const remove = document.createElement('button');
            remove.className = 'secondary-action';
            remove.type = 'button';
            remove.textContent = 'Remover';
            remove.addEventListener('click', () => {
                saveCollection(galleryKey, readCollection(galleryKey).filter((entry) => entry.id !== photo.id));
                renderAdminGallery();
                renderPublicGallery();
            });
            details.append(title, remove);
            item.append(image, details);
            list.appendChild(item);
        });
    }

    document.getElementById('photo-upload-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const fileInput = document.getElementById('photo-file');
        const captionInput = document.getElementById('photo-caption');
        const status = document.getElementById('photo-upload-status');
        const file = fileInput.files[0];
        if (!file || !file.type.startsWith('image/')) {
            status.textContent = 'Escolha um arquivo de imagem válido.';
            status.className = 'form-status error';
            return;
        }

        const reader = new FileReader();
        reader.addEventListener('load', () => {
            const photos = readCollection(galleryKey);
            photos.push({
                id: `${Date.now()}-${file.name}`,
                src: reader.result,
                alt: captionInput.value.trim() || 'Resultado de aluno Power Fit',
                caption: captionInput.value.trim() || 'Resultado Power Fit'
            });
            saveCollection(galleryKey, photos);
            event.target.reset();
            status.textContent = 'Foto publicada na vitrine de resultados.';
            status.className = 'form-status success';
            renderAdminGallery();
            renderPublicGallery();
        });
        reader.readAsDataURL(file);
    });

    function renderQuestions() {
        const list = document.getElementById('questions-list');
        if (!list) return;

        list.replaceChildren();
        const questions = readCollection(questionsKey);
        if (!questions.length) {
            const empty = document.createElement('p');
            empty.className = 'muted-text';
            empty.textContent = 'Nenhuma dúvida recebida ainda.';
            list.appendChild(empty);
            return;
        }

        questions.forEach((question) => {
            const item = document.createElement('article');
            item.className = 'question-item';
            const heading = document.createElement('strong');
            heading.textContent = question.name;
            const text = document.createElement('p');
            text.textContent = question.text;
            const answer = document.createElement('textarea');
            answer.placeholder = 'Escreva a resposta para o cliente';
            answer.value = question.answer || '';
            const button = document.createElement('button');
            button.className = 'primary-action';
            button.type = 'button';
            button.textContent = question.answer ? 'Atualizar resposta' : 'Responder cliente';
            button.addEventListener('click', () => {
                const updated = readCollection(questionsKey).map((entry) => entry.id === question.id ? { ...entry, answer: answer.value.trim() } : entry);
                saveCollection(questionsKey, updated);
                renderQuestions();
                renderPublicAnswers();
            });
            const frequentLabel = document.createElement('label');
            frequentLabel.className = 'frequent-toggle';
            const frequentInput = document.createElement('input');
            frequentInput.type = 'checkbox';
            frequentInput.checked = Boolean(question.featured);
            frequentInput.disabled = !question.answer;
            frequentInput.addEventListener('change', () => {
                const updated = readCollection(questionsKey).map((entry) => entry.id === question.id ? { ...entry, featured: frequentInput.checked } : entry);
                saveCollection(questionsKey, updated);
                renderPublicAnswers();
            });
            frequentLabel.append(frequentInput, document.createTextNode(' Mostrar no FAQ público'));
            item.append(heading, text, answer, button, frequentLabel);
            if (question.answer) {
                const sent = document.createElement('small');
                sent.className = 'question-answered';
                sent.textContent = 'Resposta publicada para o cliente.';
                item.appendChild(sent);
            }
            list.appendChild(item);
        });
    }

    document.getElementById('customer-question-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const name = document.getElementById('customer-name').value.trim();
        const text = document.getElementById('customer-question').value.trim();
        const status = document.getElementById('customer-question-status');
        const questions = readCollection(questionsKey);
        const category = document.getElementById('customer-category').value;
        questions.unshift({ id: `${Date.now()}`, name, text, category, answer: '', featured: false });
        saveCollection(questionsKey, questions);
        event.target.reset();
        status.textContent = 'Dúvida enviada. A equipe responderá em breve.';
        status.className = 'form-status success';
        renderPublicAnswers();
    });

    function renderPublicAnswers() {
        const list = document.getElementById('customer-answers');
        if (!list) return;

        list.replaceChildren();
        readCollection(questionsKey).filter((question) => question.answer).forEach((question) => {
            const item = document.createElement('article');
            item.className = 'public-answer';
            const title = document.createElement('strong');
            title.textContent = question.text;
            const answer = document.createElement('p');
            answer.textContent = question.answer;
            item.append(title, answer);
            list.appendChild(item);
        });
    }

    renderPublicGallery();
    renderAdminGallery();
    renderQuestions();
    renderPublicAnswers();

    const studentLogin = document.getElementById('student-login');
    const studentPanel = document.getElementById('student-panel');
    const studentLogout = document.getElementById('student-logout');
    const studentName = document.getElementById('student-name');
    const loginStatus = document.getElementById('login-status');
    const studentSessionKey = 'powerfit_student_session';

    function showStudentPanel(name) {
        studentLogin?.classList.add('is-hidden');
        studentPanel?.classList.remove('is-hidden');
        if (studentName) studentName.textContent = name;
    }

    const savedStudent = sessionStorage.getItem(studentSessionKey);
    if (savedStudent) showStudentPanel(savedStudent);

    studentLogin?.addEventListener('submit', (event) => {
        event.preventDefault();
        const registration = document.getElementById('registration-number').value.trim();
        const password = document.getElementById('student-password').value.trim();

        if (!registration || !password) {
            loginStatus.textContent = 'Preencha sua matrícula e senha para continuar.';
            loginStatus.className = 'form-status error';
            return;
        }

        const name = `Aluno ${registration}`;
        sessionStorage.setItem(studentSessionKey, name);
        loginStatus.textContent = 'Acesso liberado.';
        loginStatus.className = 'form-status success';
        showStudentPanel(name);
    });

    studentLogout?.addEventListener('click', () => {
        sessionStorage.removeItem(studentSessionKey);
        studentPanel?.classList.add('is-hidden');
        studentLogin?.classList.remove('is-hidden');
        studentLogin?.reset();
    });

    document.getElementById('agendamento')?.addEventListener('submit', (event) => {
        event.preventDefault();
        const assessmentStatus = document.getElementById('assessment-status');
        assessmentStatus.textContent = 'Solicitação recebida! A equipe confirmará o melhor horário pelo WhatsApp.';
        assessmentStatus.className = 'form-status success';
    });

    const paymentPanel = document.getElementById('payment-panel');
    const selectedPlan = document.getElementById('selected-plan');
    const selectedPrice = document.getElementById('selected-price');
    const paymentStatus = document.getElementById('payment-status');

    function selectPlan(card) {
        document.querySelectorAll('[data-plan]').forEach((planCard) => planCard.classList.remove('selected'));
        card.classList.add('selected');
        selectedPlan.textContent = `Plano ${card.dataset.plan}`;
        selectedPrice.textContent = card.dataset.price;
        paymentStatus.textContent = '';
        paymentPanel.classList.remove('is-hidden');
        paymentPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    document.querySelectorAll('[data-plan]').forEach((card) => {
        card.addEventListener('click', () => selectPlan(card));
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectPlan(card);
            }
        });
    });

    document.querySelectorAll('[data-payment]').forEach((option) => {
        option.addEventListener('click', () => {
            paymentStatus.textContent = `${option.dataset.payment} selecionado. Para concluir, fale com a recepção pelo WhatsApp.`;
            paymentStatus.className = 'form-status success';
        });
    });

    document.querySelectorAll('nav a').forEach((link) => {
        const href = link.getAttribute('href');
        if (!href) return;

        const isCurrentPage = href === `${page}.html` || (page === 'inicio' && href === 'inicio.html');
        if (isCurrentPage) {
            link.classList.add('active');
        }
    });

    const chatWidget = document.getElementById('chat-widget');
    const chatTrigger = document.getElementById('chat-trigger');
    const chatClose = document.getElementById('chat-close');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const chatBody = document.getElementById('chat-body');

    function addMessage(text, sender) {
        const message = document.createElement('div');
        message.className = `chat-message ${sender}`;
        message.textContent = text;
        chatBody.appendChild(message);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    function getBotReply(question) {
        const query = question.toLowerCase();

        if (query.includes('plano') || query.includes('preço') || query.includes('valor')) {
            return 'Os planos começam em R$ 89 mensais. Temos opções de mensal, trimestral e anual com benefícios especiais.';
        }

        if (query.includes('aula') || query.includes('modalidade') || query.includes('musculação') || query.includes('funcional')) {
            return 'Oferecemos musculação, funcional, cardio e aulas coletivas como spinning, alongamento e HIIT.';
        }

        if (query.includes('horario') || query.includes('funciona') || query.includes('aberto')) {
            return 'A academia funciona de segunda a sábado, das 6h às 22h.';
        }

        if (query.includes('nutri') || query.includes('alimentação')) {
            return 'Nossa nutrição inclui avaliação inicial, planejamento individual e acompanhamento contínuo.';
        }

        if (query.includes('contato') || query.includes('whatsapp') || query.includes('agendar')) {
            return 'Você pode agendar diretamente pelo botão de WhatsApp ou entrar em contato pelo telefone e-mail indicados no site.';
        }

        if (query.includes('saud') || query.includes('emagrec') || query.includes('ganho') || query.includes('força')) {
            return 'A Power Fit ajuda com foco em saúde, emagrecimento, ganho de massa e performance física com acompanhamento personalizado.';
        }

        return 'Posso te ajudar com planos, modalidades, horários, nutrição e agendamento. Pergunte como quiser!';
    }

    if (chatTrigger && chatWidget) {
        chatTrigger.addEventListener('click', () => {
            chatWidget.classList.toggle('open');
            if (chatWidget.classList.contains('open')) {
                chatInput.focus();
            }
        });
    }

    if (chatClose && chatWidget) {
        chatClose.addEventListener('click', () => {
            chatWidget.classList.remove('open');
        });
    }

    if (chatForm && chatInput && chatBody) {
        chatForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const value = chatInput.value.trim();
            if (!value) return;

            addMessage(value, 'user');
            chatInput.value = '';

            setTimeout(() => {
                addMessage(getBotReply(value), 'bot');
            }, 350);
        });
    }

    const rotatingGalleryImages = [
        ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80', 'Treino com barra'],
        ['https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80', 'Estrutura de pesos e pista'],
        ['https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80', 'Exercício kettlebell'],
        ['https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80', 'Treino funcional'],
        ['https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=80', 'Aluna treinando'],
        ['https://images.unsplash.com/photo-1546483875-ad9014c88eba?auto=format&fit=crop&w=600&q=80', 'Treino de força'],
        ['https://images.unsplash.com/photo-1579758629938-03607ccdbaba?auto=format&fit=crop&w=600&q=80', 'Área de musculação'],
        ['https://images.unsplash.com/photo-1517964603305-11c0f6f66012?auto=format&fit=crop&w=600&q=80', 'Treino com halteres'],
        ['https://images.unsplash.com/photo-1599058917212-d750089bc07e?auto=format&fit=crop&w=600&q=80', 'Condicionamento físico'],
        ['https://images.unsplash.com/photo-1586401100295-7a841e4f7c36?auto=format&fit=crop&w=600&q=80', 'Treino intenso']
    ];

    const rotatingImages = document.querySelectorAll('.gallery-grid .photo-card img');
    if (rotatingImages.length === 3) {
        let galleryIndex = 3;
        window.setInterval(() => {
            const slot = rotatingImages[galleryIndex % rotatingImages.length];
            const [source, description] = rotatingGalleryImages[galleryIndex % rotatingGalleryImages.length];
            slot.classList.add('is-changing');

            window.setTimeout(() => {
                slot.src = source;
                slot.alt = description;
                slot.classList.remove('is-changing');
            }, 220);

            galleryIndex += 1;
        }, 3200);
    }

    const revealElements = document.querySelectorAll('[data-animate]');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.16 });

    revealElements.forEach((element) => observer.observe(element));

    const interactiveCards = document.querySelectorAll('.photo-card, .photo-card-large, .info-card, .plan-card, .modalidade-card, .class-card, .nutri-card');
    interactiveCards.forEach((card) => {
        card.addEventListener('mousemove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            const rotateY = (x - 0.5) * 10;
            const rotateX = (0.5 - y) * 10;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
});
