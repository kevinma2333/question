const Storage = {
    KEYS: {
        WRONG_BOOK: 'quiz_wrong_book',
        SETTINGS: 'quiz_settings',
        EXAM_STATE: 'quiz_exam_state',
        HISTORY: 'quiz_history'
    },

    getWrongBook() {
        try {
            const data = localStorage.getItem(this.KEYS.WRONG_BOOK);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    setWrongBook(data) {
        localStorage.setItem(this.KEYS.WRONG_BOOK, JSON.stringify(data));
    },

    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    },

    setSettings(data) {
        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data));
    },

    getHistory() {
        try {
            const data = localStorage.getItem(this.KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    setHistory(data) {
        localStorage.setItem(this.KEYS.HISTORY, JSON.stringify(data));
    },

    exportData() {
        const payload = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            wrongBook: this.getWrongBook(),
            settings: this.getSettings(),
            history: this.getHistory()
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-backup-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('存档已导出');
    },

    importData(input) {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.wrongBook) {
                    this.setWrongBook(data.wrongBook);
                }
                if (data.settings) {
                    this.setSettings(data.settings);
                }
                if (data.history) {
                    this.setHistory(data.history);
                }
                App.showToast('存档已导入');
                WrongBook.loadFilters();
                History.loadFilters();
            } catch (err) {
                App.showToast('文件格式错误');
            }
        };
        reader.readAsText(file);
        input.value = '';
    },

    clearAll() {
        const msg1 = '确定要删除所有本地数据吗？此操作不可恢复！';
        const msg2 = '再次确认：所有错题、记录、设置都将被清除！';
        const msg3 = '最后确认：输入 "删除" 以确认删除所有数据。';

        if (!confirm(msg1)) return;
        if (!confirm(msg2)) return;
        const input = prompt(msg3);
        if (input !== '删除') {
            App.showToast('取消删除');
            return;
        }

        localStorage.removeItem(this.KEYS.WRONG_BOOK);
        localStorage.removeItem(this.KEYS.SETTINGS);
        localStorage.removeItem(this.KEYS.EXAM_STATE);
        localStorage.removeItem(this.KEYS.HISTORY);
        App.showToast('所有数据已删除');
        WrongBook.init();
        History.init();
    }
};
