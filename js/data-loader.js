const DataLoader = {
    async loadRootConfig() {
        const res = await fetch('data/config.json');
        if (!res.ok) throw new Error('无法加载根配置');
        return res.json();
    },

    async loadGroupConfig(folder) {
        const res = await fetch(`data/${folder}/config.json`);
        if (!res.ok) throw new Error(`无法加载题组配置: ${folder}`);
        return res.json();
    },

    async loadBankConfig(groupFolder, bankFolder) {
        const res = await fetch(`data/${groupFolder}/${bankFolder}/config.json`);
        if (!res.ok) throw new Error(`无法加载题库配置: ${bankFolder}`);
        return res.json();
    },

    async loadQuestions(groupFolder, bankFolder, setFolder) {
        const res = await fetch(`data/${groupFolder}/${bankFolder}/${setFolder}/questions.json`);
        if (!res.ok) throw new Error(`无法加载题目: ${setFolder}`);
        return res.json();
    }
};
