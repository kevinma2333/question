const PracticeMode = {
    questions: [],
    currentIndex: 0,
    answers: {},
    blankChecks: {},
    essayChecks: {},
    setInfo: null,
    container: null,
    actions: null,

    init(questions, shuffle, prefillAnswer = null, reviewMode = false, prefillBlankChecks = null, prefillEssayChecks = null) {
        this.questions = this.prepareQuestions(questions, shuffle);
        this.currentIndex = 0;
        this.answers = {};
        this.blankChecks = prefillBlankChecks || {};
        this.essayChecks = prefillEssayChecks || {};
        this.container = document.getElementById('practice-question-container');
        this.actions = document.getElementById('practice-actions');
        this.setInfo = App.setInfo;
        this.reviewMode = reviewMode;
        this.shuffle = shuffle;
        this.startTime = Date.now();
        this.returnCallback = null;

        if (prefillAnswer && this.questions.length === 1) {
            const q = this.questions[0];
            this.answers[q.id] = prefillAnswer;
        }

        App.switchView('practice-view');
        this.render();
    },

    prepareQuestions(questions, shuffle) {
        const types = ['single', 'multiple', 'judgment', 'fill', 'essay'];
        let result = [];
        types.forEach(type => {
            const typeQuestions = questions.filter(q => q.type === type);
            if (shuffle) {
                typeQuestions.sort(() => Math.random() - 0.5);
            }
            result.push(...typeQuestions);
        });
        return result;
    },

    render() {
        const q = this.questions[this.currentIndex];
        const total = this.questions.length;
        const current = this.currentIndex + 1;

        document.getElementById('practice-counter').textContent = `${current} / ${total}`;
        document.getElementById('practice-type-tag').textContent = this.getTypeLabel(q.type);
        document.getElementById('practice-progress').style.width = `${(current / total) * 100}%`;

        const userAnswer = this.answers[q.id] !== undefined ? this.answers[q.id] : null;
        const isAnswered = q.type === 'multiple'
            ? (Array.isArray(userAnswer) && userAnswer.length > 0)
            : (userAnswer !== null && userAnswer !== undefined && userAnswer !== '');
        const isObjective = ['single', 'multiple', 'judgment'].includes(q.type);

        // 复习模式：直接显示结果
        if (this.reviewMode) {
            if (isObjective) {
                const isCorrect = this.checkAnswer(q, userAnswer);
                let html = QuestionRender.render(q, {
                    mode: 'review',
                    userAnswer: userAnswer,
                    isCorrect: isCorrect,
                    context: 'practice'
                });
                let feedback = '';
                if (isCorrect) {
                    feedback = `<div class="feedback-box correct"><div class="feedback-title">回答正确</div></div>`;
                } else {
                    feedback = `<div class="feedback-box wrong"><div class="feedback-title">回答错误</div><div>正确答案：${this.formatAnswer(q)}</div></div>`;
                }
                if (q.analysis) {
                    feedback += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
                }
                this.container.innerHTML = html + feedback;
                this.actions.innerHTML = `<button class="btn-secondary" onclick="App.goHome()">返回</button>`;
                return;
            } else {
                // 主观题复习模式：显示比对
                let html = QuestionRender.render(q, {
                    mode: 'comparison',
                    userAnswer: userAnswer,
                    onBlankCheck: null,
                    blankChecks: this.blankChecks[q.id] || {},
                    context: 'practice'
                });
                if (q.analysis) {
                    html += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
                }
                this.container.innerHTML = html;
                this.actions.innerHTML = `<button class="btn-secondary" onclick="App.goHome()">返回</button>`;
                return;
            }
        }

        // 如果已经答过且是客观题，直接显示 review 模式（带答案和反馈）
        if (isAnswered && isObjective) {
            const isCorrect = this.checkAnswer(q, userAnswer);
            let html = QuestionRender.render(q, {
                mode: 'review',
                userAnswer: userAnswer,
                isCorrect: isCorrect,
                context: 'practice'
            });
            let feedback = '';
            if (isCorrect) {
                feedback = `<div class="feedback-box correct"><div class="feedback-title">回答正确</div></div>`;
            } else {
                feedback = `<div class="feedback-box wrong"><div class="feedback-title">回答错误</div><div>正确答案：${this.formatAnswer(q)}</div></div>`;
            }
            if (q.analysis) {
                feedback += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }
            this.container.innerHTML = html + feedback;
        } else {
            // 未答题或主观题，正常渲染
            let html = QuestionRender.render(q, {
                mode: 'answer',
                userAnswer: userAnswer,
                onAnswer: isObjective ? 'PracticeMode.handleObjectiveAnswer' : 'PracticeMode.handleSubjectiveInput',
                context: 'practice'
            });
            this.container.innerHTML = html;

            // 绑定事件
            if (!isObjective) {
                this.bindSubjectiveEvents(q);
            }
        }

        // 渲染操作按钮
        this.renderActions(q, isAnswered, isObjective);
    },

    bindSubjectiveEvents(q) {
        const container = document.getElementById('practice-question-container');
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
    },

    renderActions(q, isAnswered, isObjective) {
        let html = '';
        if (q.type === 'multiple') {
            html = `<button class="btn-primary" onclick="PracticeMode.submitMultiple()">提交答案</button>`;
        } else if (isObjective) {
            if (isAnswered) {
                html = `<button class="btn-primary" onclick="PracticeMode.next()">下一题</button>`;
                if (this.currentIndex > 0) {
                    html += `<button class="btn-secondary" onclick="PracticeMode.prev()">上一题</button>`;
                }
            }
        } else {
            html = `<button class="btn-primary" onclick="PracticeMode.submitSubjective()">提交答案</button>`;
        }
        this.actions.innerHTML = html;
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
            this.render();
            return;
        }

        // 单选题或判断题
        this.answers[q.id] = answer;
        const isCorrect = this.checkAnswer(q, answer);

        // 重新渲染显示结果
        let html = QuestionRender.render(q, {
            mode: 'review',
            userAnswer: answer,
            isCorrect: isCorrect
        });
        this.container.innerHTML = html;

        // 显示反馈
        let feedback = '';
        if (isCorrect) {
            feedback = `<div class="feedback-box correct"><div class="feedback-title">回答正确</div></div>`;
        } else {
            feedback = `<div class="feedback-box wrong"><div class="feedback-title">回答错误</div><div>正确答案：${this.formatAnswer(q)}</div></div>`;
        }
        if (q.analysis) {
            feedback += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
        }
        this.container.innerHTML += feedback;

        // 更新按钮
        let btnHtml = `<button class="btn-primary" onclick="PracticeMode.next()">下一题</button>`;
        if (this.currentIndex > 0) {
            btnHtml += `<button class="btn-secondary" onclick="PracticeMode.prev()">上一题</button>`;
        }
        this.actions.innerHTML = btnHtml;

        // 记录错题
        if (!isCorrect) {
            WrongBook.add(q, this.setInfo, answer);
        }
    },

    submitMultiple() {
        const q = this.questions[this.currentIndex];
        const answer = this.answers[q.id] || [];
        if (answer.length === 0) {
            App.showToast('请至少选择一个选项');
            return;
        }
        const isCorrect = this.checkAnswer(q, answer);

        // 重新渲染显示结果
        let html = QuestionRender.render(q, {
            mode: 'review',
            userAnswer: answer,
            isCorrect: isCorrect
        });
        this.container.innerHTML = html;

        // 显示反馈
        let feedback = '';
        if (isCorrect) {
            feedback = `<div class="feedback-box correct"><div class="feedback-title">回答正确</div></div>`;
        } else {
            feedback = `<div class="feedback-box wrong"><div class="feedback-title">回答错误</div><div>正确答案：${this.formatAnswer(q)}</div></div>`;
        }
        if (q.analysis) {
            feedback += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
        }
        this.container.innerHTML += feedback;

        // 更新按钮
        let btnHtml = `<button class="btn-primary" onclick="PracticeMode.next()">下一题</button>`;
        if (this.currentIndex > 0) {
            btnHtml += `<button class="btn-secondary" onclick="PracticeMode.prev()">上一题</button>`;
        }
        this.actions.innerHTML = btnHtml;

        // 记录错题
        if (!isCorrect) {
            WrongBook.add(q, this.setInfo, answer);
        }
    },

    handleSubjectiveInput() {
        const q = this.questions[this.currentIndex];
        if (q.type === 'fill') {
            const container = document.getElementById('practice-question-container');
            const inputs = container.querySelectorAll('.blank-input');
            const values = Array.from(inputs).map(input => input.value.trim());
            this.answers[q.id] = values;
        } else if (q.type === 'essay') {
            const container = document.getElementById('practice-question-container');
            const textarea = container.querySelector('.essay-textarea');
            if (textarea) {
                this.answers[q.id] = textarea.value.trim();
            }
        }
    },

    submitSubjective() {
        const q = this.questions[this.currentIndex];
        this.handleSubjectiveInput();
        const userAnswer = this.answers[q.id];

        // 显示比对界面（和考试模式相同样式，不传 onBlankCheck）
        let html = QuestionRender.render(q, {
            mode: 'comparison',
            userAnswer: userAnswer,
            context: 'practice'
        });
        this.container.innerHTML = html;

        if (q.analysis) {
            this.container.innerHTML += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
        }

        // 和考试模式相同的正确/错误判定按钮
        let btnHtml = '<div class="practice-actions" style="margin-top:20px;">';

        // 检查用户答案是否和答案完全一致
        let isPerfectMatch = false;
        if (q.type === 'fill') {
            const userVals = Array.isArray(userAnswer) ? userAnswer : [];
            const correctVals = q.answer || [];
            isPerfectMatch = userVals.length === correctVals.length && 
                userVals.every((v, i) => v && v.trim() === correctVals[i].trim());
        } else if (q.type === 'essay') {
            isPerfectMatch = userAnswer && userAnswer.trim() === (q.answer || '').trim();
        }

        // 检查是否留空
        let isBlank = false;
        if (q.type === 'fill') {
            const userVals = Array.isArray(userAnswer) ? userAnswer : [];
            isBlank = userVals.every(v => !v || v.trim() === '');
        } else if (q.type === 'essay') {
            isBlank = !userAnswer || userAnswer.trim() === '';
        }

        // 如果完全一致，隐藏"错误"按钮；如果留空，隐藏"正确"按钮
        if (!isPerfectMatch) {
            btnHtml += `<button class="btn-primary" style="background:#ef4444;border-color:#ef4444;" onclick="PracticeMode.markSubjective(false)">错误</button>`;
        }
        if (!isBlank) {
            btnHtml += `<button class="btn-primary" style="background:#22c55e;border-color:#22c55e;" onclick="PracticeMode.markSubjective(true)">正确</button>`;
        }
        btnHtml += '</div>';
        this.actions.innerHTML = btnHtml;
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

    markSubjective(isCorrect) {
        const q = this.questions[this.currentIndex];
        // 如果不正确，加入错题本
        if (!isCorrect) {
            let wrongBlanks = null;
            if (q.type === 'fill') {
                wrongBlanks = Array.from({length: q.answer.length}, (_, i) => i);
            }
            WrongBook.add(q, this.setInfo, this.answers[q.id], wrongBlanks);
        }
        this.next();
    },

    confirmSubjective() {
        const q = this.questions[this.currentIndex];
        let hasWrong = false;
        let wrongBlanks = null;

        if (q.type === 'fill') {
            const checks = this.blankChecks[q.id] || {};
            const totalBlanks = q.answer.length;
            wrongBlanks = [];
            for (let i = 0; i < totalBlanks; i++) {
                if (checks[i] === true) {
                    // 正确
                } else {
                    hasWrong = true;
                    wrongBlanks.push(i);
                }
            }
            // 如果用户没有勾选任何空，视为全错
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

        this.next();
    },

    checkAnswer(question, answer) {
        if (question.type === 'single') {
            return question.answer === answer;
        } else if (question.type === 'multiple') {
            const correct = question.answer;
            const user = Array.isArray(answer) ? answer : [answer];
            if (correct.length !== user.length) return false;
            return correct.every(a => user.includes(a)) && user.every(a => correct.includes(a));
        } else if (question.type === 'judgment') {
            return question.answer === answer;
        }
        return false;
    },

    formatAnswer(question) {
        if (question.type === 'single') return question.answer;
        if (question.type === 'multiple') return question.answer.join(', ');
        if (question.type === 'judgment') return question.answer ? '正确' : '错误';
        return '';
    },

    getTypeLabel(type) {
        const map = { single: '单选题', multiple: '多选题', judgment: '判断题', fill: '填空题', essay: '简答题' };
        return map[type] || type;
    },

    next() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.render();
        } else {
            if (this.reviewMode) {
                if (this.returnCallback) {
                    this.returnCallback();
                } else {
                    App.goHome();
                }
            } else {
                this.saveHistory();
                App.showToast('练习完成');
                if (this.returnCallback) {
                    this.returnCallback();
                } else {
                    App.goHome();
                }
            }
        }
    },

    saveHistory() {
        const record = {
            id: 'rec-' + Date.now(),
            timestamp: Date.now(),
            mode: 'practice',
            groupId: this.setInfo.groupId,
            groupName: this.setInfo.groupName,
            bankId: this.setInfo.bankId,
            bankName: this.setInfo.bankName,
            setId: this.setInfo.setId,
            setName: this.setInfo.setName,
            total: this.questions.length,
            shuffle: !!this.shuffle
        };
        History.add(record);
    },

    prev() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.render();
        }
    }
};
