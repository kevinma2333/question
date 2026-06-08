const Storage = {
    KEYS: {
        WRONG_BOOK: 'quiz_wrong_book',
        SETTINGS: 'quiz_settings',
        EXAM_STATE: 'quiz_exam_state'
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

    exportData() {
        const payload = {
            version: '1.0',
            exportTime: new Date().toISOString(),
            wrongBook: this.getWrongBook(),
            settings: this.getSettings()
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
                App.showToast('存档已导入');
                WrongBook.loadFilters();
            } catch (err) {
                App.showToast('文件格式错误');
            }
        };
        reader.readAsText(file);
        input.value = '';
    }
};
