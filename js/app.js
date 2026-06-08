const App = {
    rootConfig: null,
    currentGroup: null,
    currentBank: null,
    currentSet: null,
    currentQuestions: null,
    setInfo: null,
    navStack: [],

    async init() {
        WrongBook.init();
        try {
            this.rootConfig = await DataLoader.loadRootConfig();
            this.renderHome();
        } catch (e) {
            document.getElementById('group-list').innerHTML = '<div style="text-align:center;padding:40px;color:#ef4444;">加载失败，请检查配置</div>';
        }
    },

    // 视图切换
    switchView(viewId) {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        window.scrollTo(0, 0);
    },

    // 面包屑
    updateBreadcrumb() {
        const el = document.getElementById('breadcrumb');
        let html = '<a onclick="App.goHome()">首页</a>';
        this.navStack.forEach((item, idx) => {
            html += ` <span>/</span> `;
            if (idx === this.navStack.length - 1) {
                html += `<span style="color:#64748b;">${item.name}</span>`;
            } else {
                html += `<a onclick="${item.action}">${item.name}</a>`;
            }
        });
        el.innerHTML = html;
    },

    // 首页
    renderHome() {
        this.navStack = [];
        this.updateBreadcrumb();
        const container = document.getElementById('group-list');
        let html = '';
        this.rootConfig.groups.forEach(g => {
            html += `<div class="card" onclick="App.showGroup('${g.id}', '${g.folder}')">
                <h3>${g.name}</h3>
                <p>${g.description || ''}</p>
            </div>`;
        });
        container.innerHTML = html;
        this.switchView('home-view');
    },

    goHome() {
        this.navStack = [];
        this.updateBreadcrumb();
        this.renderHome();
    },

    // 题组页
    async showGroup(groupId, folder) {
        const group = this.rootConfig.groups.find(g => g.id === groupId);
        this.currentGroup = { ...group, config: null };
        try {
            const config = await DataLoader.loadGroupConfig(folder);
            this.currentGroup.config = config;
            this.navStack = [
                { name: group.name, action: `App.showGroup('${groupId}', '${folder}')` }
            ];
            this.updateBreadcrumb();

            document.getElementById('group-title').textContent = group.name;
            document.getElementById('group-desc').textContent = group.description || '';

            const container = document.getElementById('bank-list');
            let html = '';
            if (config.banks) {
                config.banks.forEach(b => {
                    html += `<div class="list-item" onclick="App.showBank('${b.id}', '${b.folder}')">
                        <div>
                            <h4>${b.name}</h4>
                            <p>${b.description || ''}</p>
                        </div>
                        <span class="arrow">&rsaquo;</span>
                    </div>`;
                });
            }
            if (config.sets) {
                config.sets.forEach(s => {
                    html += `<div class="list-item" onclick="App.showSet('${s.id}', '${s.folder}')">
                        <div>
                            <h4>${s.name}</h4>
                            <p>${s.description || ''}</p>
                        </div>
                        <span class="arrow">&rsaquo;</span>
                    </div>`;
                });
            }
            container.innerHTML = html;
            this.switchView('group-view');
        } catch (e) {
            this.showToast('加载失败');
        }
    },

    // 题库页
    async showBank(bankId, folder) {
        const bank = this.currentGroup.config?.banks?.find(b => b.id === bankId);
        try {
            const config = await DataLoader.loadBankConfig(this.currentGroup.folder, folder);
            this.currentBank = { id: bankId, folder: folder, config: config, name: bank?.name || folder };
            this.navStack = [
                { name: this.currentGroup.name, action: `App.showGroup('${this.currentGroup.id}', '${this.currentGroup.folder}')` },
                { name: bank?.name || folder, action: `App.showBank('${bankId}', '${folder}')` }
            ];
            this.updateBreadcrumb();

            document.getElementById('bank-title').textContent = bank?.name || folder;

            const container = document.getElementById('set-list');
            let html = '';
            if (config.sets) {
                config.sets.forEach(s => {
                    html += `<div class="list-item" onclick="App.showSet('${s.id}', '${s.folder}')">
                        <div>
                            <h4>${s.name}</h4>
                            <p>${s.description || ''}</p>
                        </div>
                        <span class="arrow">&rsaquo;</span>
                    </div>`;
                });
            }
            container.innerHTML = html;
            this.switchView('bank-view');
        } catch (e) {
            this.showToast('加载失败');
        }
    },

    // 题目集页
    async showSet(setId, folder) {
        try {
            const questions = await DataLoader.loadQuestions(
                this.currentGroup.folder,
                this.currentBank.folder,
                folder
            );
            this.currentSet = { id: setId, folder: folder, data: questions };
            this.currentQuestions = questions.questions;

            const setName = this.currentBank.config?.sets?.find(s => s.id === setId)?.name || folder;
            this.navStack = [
                { name: this.currentGroup.name, action: `App.showGroup('${this.currentGroup.id}', '${this.currentGroup.folder}')` },
                { name: this.currentBank.config?.banks?.find(b => b.id === this.currentBank.id)?.name || this.currentBank.folder, action: `App.showBank('${this.currentBank.id}', '${this.currentBank.folder}')` },
                { name: setName, action: `App.showSet('${setId}', '${folder}')` }
            ];
            this.updateBreadcrumb();

            document.getElementById('set-title').textContent = questions.title || setName;
            document.getElementById('set-desc').textContent = `${questions.questions.length} 道题`;

            this.setInfo = {
                groupId: this.currentGroup.id,
                groupName: this.currentGroup.name,
                bankId: this.currentBank.id,
                bankName: this.currentBank.name || this.currentBank.folder,
                setId: setId,
                setName: setName
            };

            this.switchView('set-view');
        } catch (e) {
            this.showToast('加载题目失败');
        }
    },

    // 开始练习
    startPractice() {
        const shuffle = document.getElementById('practice-shuffle').checked;
        PracticeMode.init(this.currentQuestions, shuffle);
    },

    // 开始考试
    startExam() {
        ExamMode.init(this.currentQuestions);
    },

    // 显示结果
    showResult(questions, answers, startTime) {
        const total = questions.length;
        let correct = 0;
        let wrong = 0;
        let subjective = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach(q => {
            totalPoints += (q.points || 5);
            const ans = answers[q.id];
            if (['single', 'multiple', 'judgment'].includes(q.type)) {
                const isCorrect = this.checkAnswer(q, ans);
                if (isCorrect) {
                    correct++;
                    earnedPoints += (q.points || 5);
                } else {
                    wrong++;
                    WrongBook.add(q, this.setInfo, ans);
                }
            } else {
                subjective++;
            }
        });

        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60);
        const secs = elapsed % 60;
        const score = Math.round((earnedPoints / totalPoints) * 100);

        // 更新最近一条考试历史记录的分数
        const history = Storage.getHistory();
        if (history.length > 0 && history[0].mode === 'exam' && !history[0].score) {
            history[0].score = score;
            Storage.setHistory(history);
        }

        // 保存考试数据用于比对
        this.examData = { questions, answers, score, correct, wrong, subjective, total, mins, secs, elapsed, totalPoints, earnedPoints };

        // 直接进入比对界面（只显示主观题）
        this.showComparison();
    },,

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

    // 显示比对
    showComparison() {
        if (!this.examData) return;
        const { questions, answers, score, correct, wrong, subjective, total, mins, secs } = this.examData;
        const container = document.getElementById('comparison-section');

        let html = '<h3 style="margin-bottom:16px;font-size:20px;">逐题比对</h3>';
        html += '<div style="margin-bottom:20px;padding:16px;background:#f8fafc;border-radius:8px;font-size:14px;color:#64748b;">客观题已自动判定。请检查主观题，未作答的可直接填写，填错的可点击答案标记对错。</div>';

        let hasUnansweredSubjective = false;

        questions.forEach((q, idx) => {
            const userAnswer = answers[q.id];
            const isObjective = ['single', 'multiple', 'judgment'].includes(q.type);

            // 只显示主观题
            if (isObjective) return;

            const isAnswered = q.type === 'fill'
                ? (Array.isArray(userAnswer) && userAnswer.some(v => v && v.trim() !== ''))
                : (userAnswer && userAnswer.trim() !== '');

            if (!isAnswered) hasUnansweredSubjective = true;

            html += `<div class="comparison-item" id="comp-${q.id}">`;
            html += `<h4>第 ${idx + 1} 题 [${this.getTypeLabel(q.type)}] ${isAnswered ? '' : '<span style="color:#ef4444;">未作答</span>'}</h4>`;
            html += `<div style="margin-bottom:10px;color:#475569;">${QuestionRender.escapeHtml(q.question)}</div>`;

            if (q.type === 'fill') {
                const userVals = Array.isArray(userAnswer) ? userAnswer : [];
                const correctVals = q.answer || [];
                for (let i = 0; i < correctVals.length; i++) {
                    const hasVal = userVals[i] && userVals[i].trim() !== '';
                    html += `<div style="margin-bottom:8px;padding:8px;background:#f8fafc;border-radius:6px;">`;
                    html += `<div style="font-weight:600;font-size:13px;color:#64748b;margin-bottom:4px;">第 ${i+1} 空</div>`;
                    if (hasVal) {
                        html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user"><span class="blank-clickable" onclick="App.toggleExamBlank('${q.id}', ${i})">${QuestionRender.escapeHtml(userVals[i])}</span></div></div>`;
                    } else {
                        html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user"><input type="text" class="blank-input" id="exam-blank-${q.id}-${i}" placeholder="填写答案" style="width:120px;"></div></div>`;
                    }
                    html += `<div class="comparison-row"><div class="comparison-label">正确答案</div><div class="comparison-value answer">${QuestionRender.escapeHtml(correctVals[i])}</div></div>`;
                    html += `</div>`;
                }
            } else if (q.type === 'essay') {
                if (isAnswered) {
                    html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user">${QuestionRender.escapeHtml(userAnswer)}</div></div>`;
                } else {
                    html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user"><textarea class="essay-textarea" id="exam-essay-${q.id}" placeholder="填写答案" style="min-height:80px;"></textarea></div></div>`;
                }
                html += `<div class="comparison-row"><div class="comparison-label">参考答案</div><div class="comparison-value answer">${QuestionRender.escapeHtml(q.answer || '无')}</div></div>`;
            }

            if (q.analysis) {
                html += `<div class="analysis-box"><strong>解析：</strong>${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }
            html += '</div>';
        });

        if (hasUnansweredSubjective) {
            html += `<div style="text-align:center;margin-top:24px;"><button class="btn-primary" id="exam-submit-answers" style="padding:14px 40px;font-size:18px;">提交补答</button></div>`;
        } else {
            html += `<div style="text-align:center;margin-top:24px;"><button class="btn-primary" id="exam-score-btn" style="padding:14px 40px;font-size:18px;">查看成绩</button></div>`;
        }

        container.innerHTML = html;
        container.scrollIntoView({ behavior: 'smooth' });

        // 绑定事件
        setTimeout(() => {
            const scoreBtn = document.getElementById('exam-score-btn');
            if (scoreBtn) {
                scoreBtn.addEventListener('click', function() {
                    App.showExamScore();
                });
            }
            const submitBtn = document.getElementById('exam-submit-answers');
            if (submitBtn) {
                submitBtn.addEventListener('click', function() {
                    App.submitExamAnswers();
                });
            }
        }, 10);
    },



    toggleExamBlank(questionId, blankIndex) {
        const q = this.examData.questions.find(q => q.id === questionId);
        const ans = this.examData.answers[questionId];
        WrongBook.add(q, this.setInfo, ans, [blankIndex]);
        App.showToast('已标记为错误并加入错题本');
    },

    toggleExamBlank(questionId, blankIndex) {
        const q = this.examData.questions.find(q => q.id === questionId);
        const ans = this.examData.answers[questionId];
        WrongBook.add(q, this.setInfo, ans, [blankIndex]);
        App.showToast('已标记为错误并加入错题本');
    },

        submitExamAnswers() {
        // 收集补答的答案
        this.examData.questions.forEach(q => {
            if (['single', 'multiple', 'judgment'].includes(q.type)) return;
            if (q.type === 'fill') {
                const correctVals = q.answer || [];
                const newVals = [];
                let hasNew = false;
                for (let i = 0; i < correctVals.length; i++) {
                    const input = document.getElementById(`exam-blank-${q.id}-${i}`);
                    if (input && input.value.trim()) {
                        newVals[i] = input.value.trim();
                        hasNew = true;
                    } else {
                        newVals[i] = this.examData.answers[q.id] && this.examData.answers[q.id][i] ? this.examData.answers[q.id][i] : '';
                    }
                }
                if (hasNew) {
                    this.examData.answers[q.id] = newVals;
                }
            } else if (q.type === 'essay') {
                const textarea = document.getElementById(`exam-essay-${q.id}`);
                if (textarea && textarea.value.trim()) {
                    this.examData.answers[q.id] = textarea.value.trim();
                }
            }
        });
        // 重新显示比对
        this.showComparison();
    },,

    showExamScore() {
        if (!this.examData) return;
        const { score, correct, wrong, subjective, total, mins, secs } = this.examData;

        this.switchView('result-view');
        document.getElementById('score-text').textContent = `${score}分`;

        const statsHtml = `
            <div class="stat-card"><div class="stat-value">${correct}</div><div class="stat-label">正确</div></div>
            <div class="stat-card"><div class="stat-value">${wrong}</div><div class="stat-label">错误</div></div>
            <div class="stat-card"><div class="stat-value">${subjective}</div><div class="stat-label">主观题</div></div>
            <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">总题数</div></div>
            <div class="stat-card"><div class="stat-value">${mins}分${secs}秒</div><div class="stat-label">用时</div></div>
        `;
        document.getElementById('result-stats').innerHTML = statsHtml;
    }

,



    formatAnswerDisplay(question, answer) {
        if (answer === null || answer === undefined) return '<span style="color:#94a3b8;">未作答</span>';
        if (question.type === 'single') return QuestionRender.escapeHtml(answer);
        if (question.type === 'multiple') return Array.isArray(answer) ? answer.map(QuestionRender.escapeHtml).join(', ') : QuestionRender.escapeHtml(answer);
        if (question.type === 'judgment') return answer ? '正确' : '错误';
        return QuestionRender.escapeHtml(String(answer));
    },

    getTypeLabel(type) {
        const map = { single: '单选', multiple: '多选', judgment: '判断', fill: '填空', essay: '简答' };
        return map[type] || type;
    },

    // 错题本
    showWrongBook() {
        this.navStack = [{ name: '错题本', action: 'App.showWrongBook()' }];
        this.updateBreadcrumb();
        WrongBook.render();
        this.switchView('wrong-book-view');
    },

    // 练习记录
    showHistory() {
        this.navStack = [{ name: '练习记录', action: 'App.showHistory()' }];
        this.updateBreadcrumb();
        History.render();
        this.switchView('history-view');
    },

    // 导入导出
    showImportExport() {
        this.navStack = [{ name: '存档管理', action: 'App.showImportExport()' }];
        this.updateBreadcrumb();
        this.switchView('import-export-view');
    },

    // 重新答题
    restart() {
        if (this.currentSet) {
            this.showSet(this.currentSet.id, this.currentSet.folder);
        } else {
            this.goHome();
        }
    },

    // 弹窗
    openModal() {
        document.getElementById('comparison-modal').classList.add('active');
    },

    closeModal() {
        document.getElementById('comparison-modal').classList.remove('active');
    },

    // Toast
    showToast(msg) {
        const toast = document.getElementById('toast');
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});;

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
