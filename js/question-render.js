const QuestionRender = {
    // 主渲染函数
    render(question, options = {}) {
        const {
            mode = 'answer',      // 'answer' | 'comparison' | 'review'
            userAnswer = null,
            isCorrect = null,
            onAnswer = null,
            onBlankCheck = null,
            blankChecks = null   // 各空的对错状态 {0: true, 1: false}
        } = options;

        switch (question.type) {
            case 'single': return this.renderSingle(question, mode, userAnswer, isCorrect, onAnswer);
            case 'multiple': return this.renderMultiple(question, mode, userAnswer, isCorrect, onAnswer);
            case 'judgment': return this.renderJudgment(question, mode, userAnswer, isCorrect, onAnswer);
            case 'fill': return this.renderFill(question, mode, userAnswer, isCorrect, onAnswer, onBlankCheck, blankChecks);
            case 'essay': return this.renderEssay(question, mode, userAnswer, isCorrect, onAnswer, onBlankCheck);
            default: return `<div>未知题型</div>`;
        }
    },

    renderSingle(question, mode, userAnswer, isCorrect, onAnswer) {
        const disabled = mode !== 'answer';
        let html = `<div class="question-text">${this.escapeHtml(question.question)}</div>`;
        html += '<div class="options-list">';
        question.options.forEach((opt, idx) => {
            const letter = opt.charAt(0);
            const isSelected = userAnswer === letter;
            const isRightAnswer = mode !== 'answer' && question.answer === letter;
            let cls = 'option-item';
            if (isSelected) cls += ' selected';
            if (mode !== 'answer') {
                cls += ' disabled';
                if (isRightAnswer) cls += ' correct';
                else if (isSelected && !isCorrect) cls += ' wrong';
            }
            html += `<div class="${cls}" ${!disabled ? `onclick="${onAnswer ? onAnswer + '\'' + letter + '\')' : ''}"` : ''}>
                <input type="radio" name="q" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                <span>${this.escapeHtml(opt)}</span>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderMultiple(question, mode, userAnswer, isCorrect, onAnswer) {
        const disabled = mode !== 'answer';
        const selected = Array.isArray(userAnswer) ? userAnswer : [];
        let html = `<div class="question-text">${this.escapeHtml(question.question)}</div>`;
        html += '<div class="options-list">';
        question.options.forEach((opt, idx) => {
            const letter = opt.charAt(0);
            const isSelected = selected.includes(letter);
            const isRightAnswer = mode !== 'answer' && question.answer.includes(letter);
            let cls = 'option-item';
            if (isSelected) cls += ' selected';
            if (mode !== 'answer') {
                cls += ' disabled';
                if (isRightAnswer) cls += ' correct';
                else if (isSelected && !isCorrect) cls += ' wrong';
            }
            html += `<div class="${cls}" ${!disabled ? `onclick="${onAnswer ? onAnswer + '\'' + letter + '\')' : ''}"` : ''}>
                <input type="checkbox" ${isSelected ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
                <span>${this.escapeHtml(opt)}</span>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderJudgment(question, mode, userAnswer, isCorrect, onAnswer) {
        const disabled = mode !== 'answer';
        const opts = question.options || ['正确', '错误'];
        const trueVal = opts[0];
        const falseVal = opts[1];
        let html = `<div class="question-text">${this.escapeHtml(question.question)}</div>`;
        html += '<div class="options-list">';

        [true, false].forEach((val, idx) => {
            const label = val ? trueVal : falseVal;
            const isSelected = userAnswer === val;
            const isRightAnswer = mode !== 'answer' && question.answer === val;
            let cls = 'option-item';
            if (isSelected) cls += ' selected';
            if (mode !== 'answer') {
                cls += ' disabled';
                if (isRightAnswer) cls += ' correct';
                else if (isSelected && !isCorrect) cls += ' wrong';
            }
            html += `<div class="${cls}" ${!disabled ? `onclick="${onAnswer ? onAnswer + '(' + val + ')' : ''}"` : ''}>
                <span>${this.escapeHtml(label)}</span>
            </div>`;
        });
        html += '</div>';
        return html;
    },

    renderFill(question, mode, userAnswer, isCorrect, onAnswer, onBlankCheck, blankChecks) {
        const answers = Array.isArray(userAnswer) ? userAnswer : [];
        const correctAnswers = question.answer || [];
        let html = '';

        if (mode === 'answer') {
            // 答题模式：将 ____ 替换为输入框
            let qText = question.question;
            let blankIdx = 0;
            qText = qText.replace(/____/g, () => {
                const val = answers[blankIdx] || '';
                const input = `<input type="text" class="blank-input" data-index="${blankIdx}" value="${this.escapeHtml(val)}" oninput="${onAnswer ? onAnswer + '()' : ''}">`;
                blankIdx++;
                return input;
            });
            html += `<div class="question-text">${qText}</div>`;
        } else {
            // 比对模式
            html += `<div class="question-text">${this.escapeHtml(question.question)}</div>`;
            html += '<div class="comparison-fill">';
            for (let i = 0; i < correctAnswers.length; i++) {
                const userVal = answers[i] || '';
                const correctVal = correctAnswers[i] || '';
                const isBlankCorrect = blankChecks && blankChecks[i] === true;

                html += `<div class="blank-check-item" style="margin-bottom:12px;padding:10px;background:#f8fafc;border-radius:8px;">`;
                html += `<div style="font-weight:600;font-size:14px;color:#64748b;margin-bottom:6px;">第 ${i+1} 空</div>`;
                html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user">${this.escapeHtml(userVal) || '<span style="color:#94a3b8;">未填写</span>'}</div></div>`;
                html += `<div class="comparison-row"><div class="comparison-label">正确答案</div><div class="comparison-value answer">${this.escapeHtml(correctVal)}</div></div>`;

                if (onBlankCheck) {
                    html += `<div class="blank-check">
                        <label><input type="checkbox" ${isBlankCorrect ? 'checked' : ''} onchange="${onBlankCheck}(${i}, this.checked)"> 此空回答正确</label>
                    </div>`;
                }
                html += '</div>';
            }
            html += '</div>';
        }
        return html;
    },

    renderEssay(question, mode, userAnswer, isCorrect, onAnswer, onBlankCheck) {
        let html = `<div class="question-text">${this.escapeHtml(question.question)}</div>`;

        if (mode === 'answer') {
            html += `<textarea class="essay-textarea" oninput="${onAnswer ? onAnswer + '()' : ''}">${this.escapeHtml(userAnswer || '')}</textarea>`;
        } else {
            html += '<div class="comparison-essay">';
            html += `<div class="comparison-row"><div class="comparison-label">你的答案</div><div class="comparison-value user">${this.escapeHtml(userAnswer || '未填写')}</div></div>`;
            html += `<div class="comparison-row"><div class="comparison-label">参考答案</div><div class="comparison-value answer">${this.escapeHtml(question.answer || '无')}</div></div>`;
            if (onBlankCheck) {
                html += `<div class="blank-check">
                    <label><input type="checkbox" ${isCorrect === true ? 'checked' : ''} onchange="${onBlankCheck}(this.checked)"> 我的回答正确</label>
                </div>`;
            }
            html += '</div>';
        }
        return html;
    },

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
};
