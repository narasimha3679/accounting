module.exports = {
    /**
     * Escapes HTML special characters to prevent HTML injection and XSS.
     * @param {string} text - The text to escape.
     * @returns {string} The escaped text.
     */
    escapeHtml: (text) => {
        if (!text) return text;
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};
