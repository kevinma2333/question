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
        this.shuffle = true;

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
                : 'ExamMode.handleSubjectiveInput',
            context: 'exam'
        });

        // 添加导航按钮
        html += '<div class="practice-actions" style="margin-top:20px;">';
        if (this.currentIndex > 0) {
            html += `<button class="btn-secondary" onclick="ExamMode.prev()">上一题</button>`;
        }
        if (this.currentIndex < total - 1) {
            html += `<button class="btn-primary" onclick="ExamMode.next()">下一题</button>`;
        } else {
            html += `<button class="btn-primary" onclick="ExamMode.submit()">提交</button>`;
        }
        html += '</div>';

        container.innerHTML = html;

        // 绑定主观题事件
        if (q.type === 'fill') {
            const inputs = container.querySelectorAll('.blank-input');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.handleSubjectiveInput());
            });
        } else if (q.type === 'essay') {
            const textarea = container.querySelector('.essay-textarea');
            if (textarea) {
                textarea.addEventListener('input', () => this.handleSubjectiveInput());
            }
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
        this.stopTimer();
        this.submitted = true;
        this.currentIndex = 0;
        this.comparisonMode = true;
        this.renderComparison();
    },

    renderComparison() {
        const q = this.questions[this.currentIndex];
        const total = this.questions.length;
        const current = this.currentIndex + 1;

        document.getElementById('exam-counter').textContent = `比对 ${current} / ${total}`;
        document.getElementById('exam-timer').textContent = '比对中';

        const container = document.getElementById('exam-question-container');
        const userAnswer = this.answers[q.id] || null;
        const isObjective = ['single', 'multiple', 'judgment'].includes(q.type);

        let html = '';
        if (isObjective) {
            const isCorrect = this.checkAnswer(q, userAnswer);
            html = QuestionRender.render(q, {
                mode: 'review',
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                context: 'exam'
            });
            let feedback = '';
            if (isCorrect) {
                feedback = `<div class="feedback-box correct"><div class="feedback-title">回答正确</div></div>`;
            } else {
                feedback = `<div class="feedback-box wrong"><div class="feedback-title">回答错误</div><div>正确答案：${this.formatAnswer(q)}</div></div>`;
                // 客观题自动计入错题本
                WrongBook.add(q, this.setInfo, userAnswer);
            }
            if (q.analysis) {
                feedback += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }
            html += feedback;
        } else if (q.type === 'fill') {
            html = QuestionRender.render(q, {
                mode: 'comparison',
                userAnswer: userAnswer,
                onBlankCheck: 'ExamMode.handleBlankCheck',
                blankChecks: this.blankChecks[q.id] || {},
                context: 'exam'
            });
            if (q.analysis) {
                html += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }
        } else if (q.type === 'essay') {
            html = QuestionRender.render(q, {
                mode: 'comparison',
                userAnswer: userAnswer,
                onBlankCheck: 'ExamMode.handleEssayCheck',
                context: 'exam'
            });
            if (q.analysis) {
                html += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }
        }

        // 导航按钮
        html += '<div class="practice-actions" style="margin-top:20px;">';
        if (this.currentIndex > 0) {
            html += `<button class="btn-secondary" onclick="ExamMode.prevComparison()">上一题</button>`;
        }
        if (this.currentIndex < total - 1) {
            html += `<button class="btn-primary" onclick="ExamMode.nextComparison()">下一题</button>`;
        } else {
            html += `<button class="btn-primary" onclick="ExamMode.finishComparison()">完成比对，查看成绩</button>`;
        }
        html += '</div>';

        container.innerHTML = html;
        this.renderSidebar();
    },

    checkAnswer(question, answer) {
        if (question.type === 'single') return question.answer === answer;
        if (question.type === 'multiple') {
            const correct = question.answer;
            const user = Array.isArray(answer) ? answer : [];
            if (correct.length !== user.length) return false;
            return correct.every(a => user.includes(a)) && user.every(a => correct.includes(a));
        }
        if (question.type === 'judgment') return question.answer === answer;
        return false;
    },

    formatAnswer(question) {
        if (question.type === 'single') return question.answer;
        if (question.type === 'multiple') return question.answer.join(', ');
        if (question.type === 'judgment') return question.answer ? '正确' : '错误';
        return '';
    },

    handleBlankCheck(index, checked) {
        const q = this.questions[this.currentIndex];
        if (!this.blankChecks[q.id]) this.blankChecks[q.id] = {};
        this.blankChecks[q.id][index] = checked;
    },

    handleEssayCheck(checked) {
        const q = this.questions[this.currentIndex];
        if (!this.blankChecks[q.id]) this.blankChecks[q.id] = {};
        this.blankChecks[q.id][0] = checked;
    },

    nextComparison() {
        this.saveCurrentComparison();
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.renderComparison();
        }
    },

    prevComparison() {
        this.saveCurrentComparison();
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.renderComparison();
        }
    },

    saveCurrentComparison() {
        const q = this.questions[this.currentIndex];
        if (['fill', 'essay'].includes(q.type)) {
            let hasWrong = false;
            let wrongBlanks = null;

            if (q.type === 'fill') {
                const checks = this.blankChecks[q.id] || {};
                const totalBlanks = q.answer.length;
                wrongBlanks = [];
                for (let i = 0; i < totalBlanks; i++) {
                    if (checks[i] !== true) {
                        hasWrong = true;
                        wrongBlanks.push(i);
                    }
                }
                if (Object.keys(checks).length === 0) {
                    hasWrong = true;
                    wrongBlanks = Array.from({length: totalBlanks}, (_, i) => i);
                }
            } else if (q.type === 'essay') {
                const checks = this.blankChecks[q.id] || {};
                if (checks[0] !== true) {
                    hasWrong = true;
                }
            }

            if (hasWrong) {
                WrongBook.add(q, this.setInfo, this.answers[q.id], wrongBlanks);
            }
        }
    },

    finishComparison() {
        this.saveCurrentComparison();
        const duration = Math.floor((Date.now() - this.startTime) / 1000);
        this.saveHistory(duration);
        App.showResult(this.questions, this.answers, this.startTime);
    },

    saveHistory(duration) {
        const record = {
            id: 'rec-' + Date.now(),
            timestamp: Date.now(),
            mode: 'exam',
            groupId: this.setInfo.groupId,
            groupName: this.setInfo.groupName,
            bankId: this.setInfo.bankId,
            bankName: this.setInfo.bankName,
            setId: this.setInfo.setId,
            setName: this.setInfo.setName,
            total: this.questions.length,
            shuffle: true,
            duration: duration
        };
        History.add(record);
    }
};
