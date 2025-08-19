const logger = require("../utils/logger");
const increaseBackOffTime = (currentBackoffTime) => currentBackoffTime * 2;
const calculateBackoffDelaysMs = (backoffTime) => 1000 * (backoffTime + Math.random());

const backOff = (minTime) => (maxTime) => (fn, onErrorEnd, onSuccess, onError) => {
    const _run = (currentTime) => (...arg) => {
        setTimeout(async () => {
            try {
                const result = await fn(...arg);

                if (onSuccess) {
                    onSuccess(result);
                }
            } catch (error) {
                logger.error(`Backoff error attempt ${currentTime}s:`, error);

                if (currentTime > maxTime) {
                    if (onErrorEnd) {
                        onErrorEnd(error, ...arg);
                    }
                    return;
                }

                if (onError) {
                    onError(error);
                }

                _run(increaseBackOffTime(currentTime))(...arg);
            }
        }, calculateBackoffDelaysMs(currentTime));
    };

    return _run(minTime);
};

module.exports = { backOff };