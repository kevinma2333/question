const WrongBook = {
    items: [],

    init() {
        this.items = Storage.getWrongBook();
    },

    add(question, setInfo, userAnswer, wrongBlanks = null) {
        const existing = this.items.find(item =>
            item.groupId === setInfo.groupId &&
            item.bankId === setInfo.bankId &&
            item.setId === setInfo.setId &&
            item.questionId === question.id
        );

        if (existing) {
            existing.count += 1;
            existing.timestamp = Date.now();
            // 记录每次错误的答案
            if (!existing.wrongAnswers) existing.wrongAnswers = [];
            existing.wrongAnswers.unshift({
                answer: userAnswer,
                wrongBlanks: wrongBlanks,
                time: Date.now()
            });
            // 只保留最近10次记录
            if (existing.wrongAnswers.length > 10) {
                existing.wrongAnswers = existing.wrongAnswers.slice(0, 10);
            }
            existing.userAnswer = userAnswer;
            existing.wrongBlanks = wrongBlanks;
        } else {
            this.items.push({
                id: `${setInfo.groupId}-${setInfo.bankId}-${setInfo.setId}-${question.id}`,
                groupId: setInfo.groupId,
                groupName: setInfo.groupName,
                bankId: setInfo.bankId,
                bankName: setInfo.bankName,
                setId: setInfo.setId,
                setName: setInfo.setName,
                questionId: question.id,
                question: question,
                userAnswer: userAnswer,
                wrongBlanks: wrongBlanks,
                wrongAnswers: [{ answer: userAnswer, wrongBlanks: wrongBlanks, time: Date.now() }],
                timestamp: Date.now(),
                count: 1
            });
        }
        this.save();
    },

    remove(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.save();
    },

    clearAll() {
        if (!confirm('确定要清空所有错题吗？')) return;
        this.items = [];
        this.save();
        this.render();
    },

    save() {
        Storage.setWrongBook(this.items);
    },

    getFiltered(groupId, bankId) {
        return this.items.filter(item => {
            if (groupId && item.groupId !== groupId) return false;
            if (bankId && item.bankId !== bankId) return false;
            return true;
        }).sort((a, b) => b.timestamp - a.timestamp);
    },

    loadFilters() {
        const groupSelect = document.getElementById('filter-group');
        const bankSelect = document.getElementById('filter-bank');
        if (!groupSelect) return;

        // 收集所有题组和题库
        const groups = {};
        this.items.forEach(item => {
            if (!groups[item.groupId]) {
                groups[item.groupId] = { name: item.groupName, banks: {} };
            }
            groups[item.groupId].banks[item.bankId] = item.bankName;
        });

        const currentGroup = groupSelect.value;
        const currentBank = bankSelect.value;

        groupSelect.innerHTML = '<option value="">全部题组</option>';
        Object.entries(groups).forEach(([id, info]) => {
            groupSelect.innerHTML += `<option value="${id}">${info.name}</option>`;
        });
        groupSelect.value = currentGroup;

        // 更新题库选项
        bankSelect.innerHTML = '<option value="">全部题库</option>';
        if (currentGroup && groups[currentGroup]) {
            Object.entries(groups[currentGroup].banks).forEach(([id, name]) => {
                bankSelect.innerHTML += `<option value="${id}">${name}</option>`;
            });
        } else {
            // 显示所有题库
            const allBanks = {};
            this.items.forEach(item => {
                allBanks[item.bankId] = item.bankName;
            });
            Object.entries(allBanks).forEach(([id, name]) => {
                bankSelect.innerHTML += `<option value="${id}">${name}</option>`;
            });
        }
        bankSelect.value = currentBank;
    },

    render() {
        this.init();
        this.loadFilters();
        const container = document.getElementById('wrong-book-list');
        const groupId = document.getElementById('filter-group').value;
        const bankId = document.getElementById('filter-bank').value;
        const items = this.getFiltered(groupId, bankId);

        if (items.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding:40px;color:#94a3b8;">暂无错题</div>';
            return;
        }

        let html = '';
        items.forEach(item => {
            const date = new Date(item.timestamp).toLocaleDateString();
            let wrongAnswersHtml = '';
            if (item.wrongAnswers && item.wrongAnswers.length > 0) {
                wrongAnswersHtml = '<div class="wrong-answers-list"><h5>历史错误记录</h5>';
                item.wrongAnswers.slice(0, 3).forEach((wa, idx) => {
                    const ansText = Array.isArray(wa.answer) ? wa.answer.join(', ') : (wa.answer || '未填写');
                    wrongAnswersHtml += `<div class="wrong-answer-item">第${idx + 1}次: ${QuestionRender.escapeHtml(ansText)}</div>`;
                });
                if (item.wrongAnswers.length > 3) {
                    wrongAnswersHtml += `<div style="font-size:12px;color:#94a3b8;padding:4px 10px;">还有 ${item.wrongAnswers.length - 3} 次记录...</div>`;
                }
                wrongAnswersHtml += '</div>';
            }
            html += `<div class="wrong-item">
                <div class="wrong-item-header">
                    <div>
                        <div style="font-weight:600;margin-bottom:4px;">${QuestionRender.escapeHtml(item.question.question.substring(0, 60))}${item.question.question.length > 60 ? '...' : ''}</div>
                        <div class="wrong-item-meta">${item.groupName} / ${item.bankName} / ${item.setName} | 错误 ${item.count} 次 | ${date}</div>
                    </div>
                </div>
                ${wrongAnswersHtml}
                <div class="wrong-item-actions">
                    <button class="btn-primary btn-sm" onclick="WrongBook.review('${item.id}')">复习</button>
                    <button class="btn-secondary btn-sm" onclick="WrongBook.remove('${item.id}'); WrongBook.render();">删除</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    review(id) {
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        // 进入练习模式，只复习这一道题
        App.currentGroup = { id: item.groupId, folder: item.groupId };
        App.currentBank = { id: item.bankId, folder: item.bankId };
        App.currentSet = { id: item.setId, folder: item.setId };
        App.currentQuestions = [item.question];
        App.setInfo = {
            groupId: item.groupId,
            groupName: item.groupName,
            bankId: item.bankId,
            bankName: item.bankName,
            setId: item.setId,
            setName: item.setName
        };
        let blankChecks = {};
        let essayChecks = {};
        if (item.question.type === 'fill' && item.wrongBlanks) {
            blankChecks[item.question.id] = {};
            const totalBlanks = item.question.answer.length;
            for (let i = 0; i < totalBlanks; i++) {
                blankChecks[item.question.id][i] = !item.wrongBlanks.includes(i);
            }
        } else if (item.question.type === 'essay') {
            essayChecks[item.question.id] = false;
        }
        // 设置返回回调
        PracticeMode.returnCallback = () => {
            App.showWrongBook();
        };
        PracticeMode.init([item.question], false, item.userAnswer, true, blankChecks, essayChecks);
    },

    practiceWrong() {
        const groupId = document.getElementById('filter-group').value;
        const bankId = document.getElementById('filter-bank').value;
        const items = this.getFiltered(groupId, bankId);
        if (items.length === 0) {
            App.showToast('当前筛选条件下没有错题');
            return;
        }
        const questions = items.map(item => item.question);
        // 使用第一个错题的 setInfo
        const first = items[0];
        App.setInfo = {
            groupId: first.groupId,
            groupName: first.groupName,
            bankId: first.bankId,
            bankName: first.bankName,
            setId: first.setId,
            setName: first.setName + '（错题练习）'
        };
        PracticeMode.returnCallback = () => {
            App.showWrongBook();
        };
        PracticeMode.init(questions, true);
    }
};
