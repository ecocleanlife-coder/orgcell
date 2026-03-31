const { Lunar } = require('lunar-javascript');

/**
 * 음력 날짜를 양력으로 변환
 * @param {number} year - 양력 연도 (해당 연도 기준으로 변환)
 * @param {number} month - 음력 월
 * @param {number} day - 음력 일
 * @param {boolean} isLeap - 윤달 여부
 * @returns {{ year: number, month: number, day: number, date: string } | null}
 */
function lunarToSolar(year, month, day, isLeap = false) {
    try {
        const lunar = Lunar.fromYmd(year, month, day);
        const solar = lunar.getSolar();
        return {
            year: solar.getYear(),
            month: solar.getMonth(),
            day: solar.getDay(),
            date: `${solar.getYear()}-${String(solar.getMonth()).padStart(2, '0')}-${String(solar.getDay()).padStart(2, '0')}`,
        };
    } catch {
        return null;
    }
}

module.exports = { lunarToSolar };
