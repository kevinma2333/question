const ExamMode = {
    questions: [],
    currentIndex: 0,
    answers: {},
    blankChecks: {},
    essayChecks: {},
    setInfo: null,
    startTime: null,
    timerInterval: null,
    submitted: false,

    init(questions) {
        this.questions = this.prepareQuestions(questions);
        this.currentIndex = 0;
        this.answers = {};
        this.blankChecks = {};
        this.essayChecks = {};
        this.setInfo = App.setInfo;
        this.startTime = Date.now();
        this.submitted = false;

        App.switchView('exam-view');
        this.startTimer();
        this.renderSidebar();
        this.renderQuestion();
    },

    prepareQuestions(questions) {
        const types = ['single', 'multiple', 'judgment', 'fill', 'essay'];
        let result = [];
        types.forEach(type => {
            const typeQuestions = questions.filter(q => q.type === type);
            typeQuestions.sort(() => Math.random() - 0.5);
            result.push(...typeQuestions);
        });
        return result;
    },

    startTimer() {
        const timerEl = document.getElementById('exam-timer');
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    },

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    },

    renderSidebar() {
        const sidebar = document.getElementById('exam-sidebar');
        let html = '<div style="font-weight:600;margin-bottom:12px;font-size:14px;">题目导航</div>';
        html += '<div class="question-nav">';
        this.questions.forEach((q, idx) => {
            const isAnswered = this.isAnswered(q);
            const isActive = idx === this.currentIndex;
            let cls = 'nav-num';
            if (isActive) cls += ' active';
            else if (isAnswered) cls += ' answered';
            html += `<div class="${cls}" onclick="ExamMode.jumpTo(${idx})">${idx + 1}</div>`;
        });
        html += '</div>';
        sidebar.innerHTML = html;
    },

    isAnswered(question) {
        const ans = this.answers[question.id];
        if (ans === null || ans === undefined || ans === '') return false;
        if (Array.isArray(ans) && ans.every(v => !v)) return false;
        return true;
    },

    renderQuestion() {
        const q = this.questions[this.currentIndex];
        const total = this.questions.length;
        const current = this.currentIndex + 1;

        document.getElementById('exam-counter').textContent = `${current} / ${total}`;

        const container = document.getElementById('exam-question-container');
        const userAnswer = this.answers[q.id] || null;

        let html = QuestionRender.render(q, {
            mode: 'answer',
            userAnswer: userAnswer,
            onAnswer: ['single', 'multiple', 'judgment'].includes(q.type)
                ? 'ExamMode.handleObjectiveAnswer'
                : 'ExamMode.handleSubjectiveInput'
        });

        // 添加导航按钮
        html += '<div class="practice-actions" style="margin-top:20px;">';
        if (this.currentIndex > 0) {
            html += `<button class="btn-secondary" onclick="ExamMode.prev()">上一题</button>`;
        }
        if (q.type === 'multiple') {
            html += `<button class="btn-primary" onclick="ExamMode.submitMultiple()">提交并下一题</button>`;
        } else if (this.currentIndex < total - 1) {
            html += `<button class="btn-primary" onclick="ExamMode.next()">下一题</button>`;
        }
        html += '</div>';

        container.innerHTML = html;

        // 绑定主观题事件
        if (q.type === 'fill') {
            const inputs = container.querySelectorAll('.blank-input');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.handleSubjectiveInput());
            });
        }

        this.renderSidebar();
    },

    handleObjectiveAnswer(answer) {
        const q = this.questions[this.currentIndex];
        if (q.type === 'multiple') {
            let current = this.answers[q.id] || [];
            const idx = current.indexOf(answer);
            if (idx > -1) {
                current = current.filter(a => a !== answer);
            } else {
                current = [...current, answer];
            }
            this.answers[q.id] = current;
        } else {
            this.answers[q.id] = answer;
        }
        this.renderSidebar();
        this.renderQuestion();
    },

    handleSubjectiveInput() {
        const q = this.questions[this.currentIndex];
        if (q.type === 'fill') {
            const container = document.getElementById('exam-question-container');
            const inputs = container.querySelectorAll('.blank-input');
            const values = Array.from(inputs).map(input => input.value.trim());
            this.answers[q.id] = values;
        } else if (q.type === 'essay') {
            const container = document.getElementById('exam-question-container');
            const textarea = container.querySelector('.essay-textarea');
            if (textarea) {
                this.answers[q.id] = textarea.value.trim();
            }
        }
        this.renderSidebar();
    },

    jumpTo(index) {
        this.currentIndex = index;
        this.renderQuestion();
    },

    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.renderQuestion();
        }
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderQuestion();
        }
    },

    submit() {
        const unanswered = this.questions.filter(q => !this.isAnswered(q));
        if (unanswered.length > 0) {
            if (!confirm(`还有 ${unanswered.length} 道题未作答，确定要交卷吗？`)) return;
        }

        this.stopTimer();
        this.submitted = true;
        App.showResult(this.questions, this.answers, this.startTime);
    }
};
