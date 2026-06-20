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
                    <button class="btn-secondary btn-sm" onclick="History.remove('${r.id}'); History.render();">删除</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }
};
