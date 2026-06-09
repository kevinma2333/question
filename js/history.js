const History = {
    records: [],

    init() {
        this.records = Storage.getHistory();
    },

    add(record) {
        this.records.unshift(record);
        this.save();
    },

    remove(id) {
        this.records = this.records.filter(r => r.id !== id);
        this.save();
    },

    clearAll() {
        if (!confirm('确定要清空所有练习记录吗？')) return;
        this.records = [];
        this.save();
        this.render();
    },

    save() {
        Storage.setHistory(this.records);
    },

    getFiltered() {
        const modeFilter = document.getElementById('history-filter-mode').value;
        const shuffleFilter = document.getElementById('history-filter-shuffle').value;
        const groupFilter = document.getElementById('history-filter-group').value;

        return this.records.filter(r => {
            if (modeFilter && r.mode !== modeFilter) return false;
            if (shuffleFilter !== '' && String(r.shuffle) !== shuffleFilter) return false;
            if (groupFilter && r.groupId !== groupFilter) return false;
            return true;
        });
    },

    loadFilters() {
        const groupSelect = document.getElementById('history-filter-group');
        if (!groupSelect) return;

        const groups = {};
        this.records.forEach(r => {
            groups[r.groupId] = r.groupName;
        });

        const current = groupSelect.value;
        groupSelect.innerHTML = '<option value="">全部题组</option>';
        Object.entries(groups).forEach(([id, name]) => {
            groupSelect.innerHTML += `<option value="${id}">${name}</option>`;
        });
        groupSelect.value = current;
    },

    render() {
        this.init();
        this.loadFilters();
        const container = document.getElementById('history-list');
        const records = this.getFiltered();

        if (records.length === 0) {
            container.innerHTML = '<div class="text-center" style="padding:40px;color:#94a3b8;">暂无练习记录</div>';
            return;
        }

        let html = '';
        records.forEach(r => {
            const date = new Date(r.timestamp).toLocaleString();
            const modeLabel = r.mode === 'practice' ? '练习模式' : '考试模式';
            const shuffleLabel = r.shuffle ? ' | 已打乱' : '';
            const timeLabel = r.mode === 'exam' && r.duration ? ` | 用时 ${Math.floor(r.duration / 60)}分${r.duration % 60}秒` : '';
            const scoreLabel = r.score !== undefined ? ` | 得分 ${r.score}分` : '';

            html += `<div class="history-item">
                <div class="history-main">
                    <div class="history-title">${QuestionRender.escapeHtml(r.setName)}</div>
                    <div class="history-meta">${r.groupName} / ${r.bankName} / ${r.setName}</div>
                    <div class="history-detail">
                        <span class="history-tag mode-${r.mode}">${modeLabel}</span>
                        <span class="history-tag">${r.total} 题</span>
                        ${r.shuffle ? '<span class="history-tag">已打乱</span>' : ''}
                        ${r.score !== undefined ? `<span class="history-tag">${r.score}分</span>` : ''}
                        ${r.mode === 'exam' && r.duration ? `<span class="history-tag">${Math.floor(r.duration / 60)}分${r.duration % 60}秒</span>` : ''}
                    </div>
                </div>
                <div class="history-side">
                    <div class="history-date">${date}</div>
                    <button class="btn-primary btn-sm" onclick="History.viewDetail('${r.id}')">查看详情</button>
                    <button class="btn-secondary btn-sm" onclick="History.remove('${r.id}'); History.render();">删除</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    },

    viewDetail(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return;

        // 切换到详情视图
        App.switchView('history-detail-view');
        const container = document.getElementById('history-detail-content');

        let html = '<h3 style="margin-bottom:16px;">答题详情</h3>';
        html += `<div style="margin-bottom:20px;padding:12px;background:#f8fafc;border-radius:8px;">
            <strong>${record.setName}</strong> | ${record.mode === 'exam' ? '考试模式' : '练习模式'} | ${record.total}题
            ${record.score !== undefined ? ` | 得分: ${record.score}分` : ''}
            ${record.duration ? ` | 用时: ${Math.floor(record.duration / 60)}分${record.duration % 60}秒` : ''}
        </div>`;

        if (!record.questions || !record.answers) {
            html += '<div style="color:#94a3b8;">该记录没有保存答题详情（旧版本记录）</div>';
            container.innerHTML = html;
            return;
        }

        record.questions.forEach((q, idx) => {
            const userAnswer = record.answers[q.id];
            const isObjective = ['single', 'multiple', 'judgment'].includes(q.type);
            let status = '';
            let statusColor = '';

            if (isObjective) {
                const isCorrect = App.checkAnswer(q, userAnswer);
                if (isCorrect) {
                    status = '正确';
                    statusColor = '#22c55e';
                } else {
                    status = '错误';
                    statusColor = '#ef4444';
                }
            } else {
                if (userAnswer === null || userAnswer === undefined || 
                    (Array.isArray(userAnswer) && userAnswer.every(v => !v || v.trim() === '')) ||
                    (typeof userAnswer === 'string' && userAnswer.trim() === '')) {
                    status = '未作答';
                    statusColor = '#94a3b8';
                } else {
                    status = '已作答';
                    statusColor = '#3b82f6';
                }
            }

            html += `<div class="history-detail-item" style="margin-bottom:16px;padding:16px;background:#f8fafc;border-radius:8px;">`;
            html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">`;
            html += `<strong>第 ${idx + 1} 题 [${App.getTypeLabel(q.type)}]</strong>`;
            html += `<span style="color:${statusColor};font-weight:600;">${status}</span>`;
            html += `</div>`;
            html += `<div style="color:#475569;margin-bottom:8px;">${QuestionRender.escapeHtml(q.question)}</div>`;

            // 显示用户答案
            let userAnswerStr = '';
            if (userAnswer === null || userAnswer === undefined) {
                userAnswerStr = '<span style="color:#94a3b8;">未作答</span>';
            } else if (q.type === 'multiple') {
                userAnswerStr = Array.isArray(userAnswer) && userAnswer.length > 0 
                    ? userAnswer.map(QuestionRender.escapeHtml).join(', ')
                    : '<span style="color:#94a3b8;">未作答</span>';
            } else if (q.type === 'judgment') {
                userAnswerStr = userAnswer === true ? '正确' : (userAnswer === false ? '错误' : '<span style="color:#94a3b8;">未作答</span>');
            } else if (q.type === 'fill') {
                const vals = Array.isArray(userAnswer) ? userAnswer : [];
                userAnswerStr = vals.map((v, i) => `第${i+1}空: ${v ? QuestionRender.escapeHtml(v) : '<span style="color:#94a3b8;">未填</span>'}`).join(' | ');
            } else {
                userAnswerStr = QuestionRender.escapeHtml(String(userAnswer));
            }
            html += `<div style="margin-bottom:6px;"><strong>你的答案:</strong> ${userAnswerStr}</div>`;

            // 显示正确答案
            let correctAnswerStr = '';
            if (q.type === 'multiple') {
                correctAnswerStr = Array.isArray(q.answer) ? q.answer.map(QuestionRender.escapeHtml).join(', ') : '';
            } else if (q.type === 'judgment') {
                correctAnswerStr = q.answer === true ? '正确' : '错误';
            } else if (q.type === 'fill') {
                const vals = Array.isArray(q.answer) ? q.answer : [];
                correctAnswerStr = vals.map((v, i) => `第${i+1}空: ${QuestionRender.escapeHtml(v)}`).join(' | ');
            } else {
                correctAnswerStr = QuestionRender.escapeHtml(String(q.answer));
            }
            html += `<div style="margin-bottom:6px;"><strong>正确答案:</strong> <span style="color:#22c55e;">${correctAnswerStr}</span></div>`;

            // 显示解析
            if (q.analysis) {
                html += `<div style="margin-top:8px;padding:8px;background:#fff;border-radius:6px;"><strong>解析:</strong> ${QuestionRender.escapeHtml(q.analysis)}</div>`;
            }

            html += `</div>`;
        });

        html += `<div style="text-align:center;margin-top:20px;">
            <button class="btn-secondary" onclick="App.showHistory()">返回历史记录</button>
        </div>`;

        container.innerHTML = html;
    }
};
