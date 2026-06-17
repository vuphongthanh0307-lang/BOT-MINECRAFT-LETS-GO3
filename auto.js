const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

// ==========================================
// BĂNG DÍNH 3 LỚP: DÁN MỒM LỖI CHUNK NGỨA MẮT
// ==========================================
const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalLog.apply(console, args);
};
const originalWarn = console.warn;
console.warn = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalWarn.apply(console, args);
};
const originalError = console.error;
console.error = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalError.apply(console, args);
};

const RECONNECT_DELAY = 20000; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Conchohieungu đang Câu Cá VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// TRẠNG THÁI GỐC CỦA BOT
let botState = 'DISCONNECTED'; 
let currentBot; 
let isLoggingIn = false; 
let isComboRunning = false; 
let isGUIOpen = false; 
let failCount = 0;
let isSonarKick = false; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'FaiDepTrong', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 60000,
        respawn: false 
    });

    currentBot = bot; 

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) originalLog('[Chat] ' + jsonMsg.toAnsi());
        else originalLog('[Chat] ' + jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/dn Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
            botState = 'FIRST_LOGIN';
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn Windvu2193'), 1500); 
        }

        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im như tượng chờ nó cấp giấy chứng nhận...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; 
        }

        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời: ${match[1]}! Đang join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện bị ném ra Sảnh! Tự động lôi la bàn ra đục lỗ...');
            botState = 'IN_HUB'; 
            isComboRunning = false; 
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị Giết! Nằm im chờ server kick AFK...');
        }

        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {
            if (botState !== 'FARMING') {
                console.log(`[Mắt Thần] ĐÃ LỌT VÀO CỤM CHƠI! Khóa Hub, Xách cần đi câu!`);
                botState = 'FARMING';
                isComboRunning = false; 
                startFishingProcess(bot);
            }
        }
    });

    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        if (botState === 'FARMING' || botState === 'WAIT_AUTO') return; 

        const items = currentBot.inventory.items();
        const hasCompass = items.some(i => i.name === 'compass');

        if (hasCompass) {
            botState = 'IN_HUB'; 
            if (!isGUIOpen) {
                console.log('[Hub] Đang cầm La Bàn Sảnh! Tiến hành click Menu...');
                currentBot.setQuickBarSlot(4);
                currentBot.activateItem();
            }
        } 
    }, 3000); 

    bot.on('windowOpen', async (window) => {
        if (isGUIOpen || botState === 'WAIT_AUTO') return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ bế vào cụm...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    bot.on('kicked', (reason) => {
        let reasonStr = '';
        try { reasonStr = JSON.stringify(reason); } 
        catch (e) { reasonStr = reason.toString(); }
        
        if (reasonStr.toLowerCase().includes('xác minh') || reasonStr.toLowerCase().includes('thành công') || reasonStr.toLowerCase().includes('vượt qua')) {
            console.log('>>> [Anti-Bot] Đã đọc được bảng "XÁC MINH THÀNH CÔNG" từ server!');
            isSonarKick = true; 
        } else {
            console.log(`[BỊ KICK] Lý do khác: ${reasonStr}`);
        }
    });

    bot.on('death', () => {
        bot.clearControlStates();
        isComboRunning = false;
        if (botState !== 'FARMING') {
            setTimeout(() => bot.respawn(), 2000);
        } else {
            console.log('[CẢNH BÁO] Bot bị giết! Nằm phơi xác...');
        }
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã bị văng hẳn khỏi cụm máy chủ!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 

        if (isSonarKick) {
            isSonarKick = false; 
            failCount = 0; 
            console.log(`[Anti-Bot] Đang chờ 12 giây để server cập nhật danh sách...`);
            
            let waitTime = 12;
            const countdownInterval = setInterval(() => {
                console.log(`... Đang đếm ngược: ${waitTime} giây nữa sẽ vô lại ...`);
                waitTime--;
                if (waitTime <= 0) {
                    clearInterval(countdownInterval);
                    console.log(`[Anti-Bot] Hết giờ! Phi thẳng vô lượm lúa!!!`);
                    createBot();
                }
            }, 1000); 
            return; 
        }

        failCount++;
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng...`);
            failCount = 0; 
            setTimeout(createBot, 40000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==================================================
// KỊCH BẢN CẦN THỦ (KHÔNG BẺ CỔ, GIỮ NGUYÊN GÓC /HOME)
// ==================================================
async function startFishingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await sleep(2000);
        
        console.log('[Câu Cá] Đang phi về bãi (/home)...');
        bot.chat('/home'); 
        await sleep(6000); // Đợi load map bãi câu

        console.log('[Câu Cá] Tới hồ rồi! Đợi tí lấy hơi rồi móc giun...');
        await sleep(2000); // Đợi tí theo ý pháp sư

        // VÒNG LẶP CÂU CÁ
        while (botState === 'FARMING') {
            const fishingRod = bot.inventory.items().find(item => item.name === 'fishing_rod');
            if (!fishingRod) {
                console.log('>>> [Hết Cần] Không thấy cần câu! Đứng ngáp chờ... (Kiểm tra rương/túi đồ)');
                await sleep(10000);
                continue; 
            }

            // Cầm cần lên
            await bot.equip(fishingRod, 'hand');

            try {
                // Nghỉ tay ngẫu nhiên 0.3s -> 0.8s (Chống Anti-Cheat thời gian)
                await randomSleep(300, 800); 

                console.log('[Câu Cá] 🎣 Đang quăng mồi... Chờ cá cắn!');
                
                // bot.fish() sẽ lo việc chờ phao chìm và giật
                await bot.fish(); 
                
                console.log('[Câu Cá] 🐟 LỤM CÁ! Dính rồi! Đang gỡ cá...');
                failCount = 0; 
                
                // Nghỉ xả hơi ngẫu nhiên từ 0.8s -> 1.8s rồi mới ném tiếp
                await randomSleep(800, 1800); 

            } catch (err) {
                console.log('[Câu Cá] Rớt mồi hoặc đứt dây. Nghỉ ngơi tí rồi quăng lại...', err.message);
                await randomSleep(1500, 2500);
            }
        }

    } catch (err) {
        console.log('[Câu Cá] Lỗi Kịch Bản:', err.message);
    } finally {
        isComboRunning = false; 
    }
}
// ==========================================
// TÍNH NĂNG VÔ LĂNG LÁI XE VÀ CHAT TỪ REPLIT
// ==========================================
let lastChatTime = 0;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async (input) => {
    if (!currentBot) {
        console.log('[Lỗi] Bot chưa vào game, không nhận lệnh được!');
        return;
    }

    const rawInput = input.trim();
    const cmdParts = rawInput.toLowerCase().split(/\s+/); 
    const cmd = cmdParts[0]; 
    const val = cmdParts[1] ? parseFloat(cmdParts[1]) : null; 

    try {
        if (cmd === '/stop') { 
            currentBot.clearControlStates(); 
            console.log('>> [WASD] PHANH GẤP!'); 
            return; 
        }
        if (cmd === '/stand') { 
            currentBot.setControlState('sneak', true); 
            setTimeout(() => currentBot.setControlState('sneak', false), 300); 
            console.log('>> [HÀNH ĐỘNG] ĐỨNG DẬY!'); 
            return; 
        }

        if (cmd === '/trai' || cmd === '/trái') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw + (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay TRÁI ${angle} độ`); return; 
        }
        if (cmd === '/phai' || cmd === '/phải') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw - (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay PHẢI ${angle} độ`); return; 
        }
        if (cmd === '/sau') { 
            await currentBot.look(currentBot.entity.yaw + Math.PI, currentBot.entity.pitch, false); 
            console.log('>> [CAMERA] Quay SAU 180 độ'); return; 
        }
        if (cmd === '/len' || cmd === '/lên') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.max(-Math.PI/2, currentBot.entity.pitch - (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Ngước LÊN ${angle} độ`); return; 
        }
        if (cmd === '/xuong' || cmd === '/xuống') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.min(Math.PI/2, currentBot.entity.pitch + (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Cúi XUỐNG ${angle} độ`); return; 
        }

        const moveKeys = cmd.replace('/', '');
        if (/^(w|a|s|d|j|sh)+$/.test(moveKeys)) {
            currentBot.clearControlStates();
            let logMsg = ">> [WASD] Di chuyển:";
            if (moveKeys.includes('w')) { currentBot.setControlState('forward', true); logMsg += ' Tiến'; }
            if (moveKeys.includes('s')) { currentBot.setControlState('back', true); logMsg += ' Lùi'; }
            if (moveKeys.includes('a')) { currentBot.setControlState('left', true); logMsg += ' Trái'; }
            if (moveKeys.includes('d')) { currentBot.setControlState('right', true); logMsg += ' Phải'; }
            if (moveKeys.includes('sh')) { currentBot.setControlState('sneak', true); logMsg += ' (Shift)'; }
            if (moveKeys.includes('j')) { currentBot.setControlState('jump', true); logMsg += ' + Nhảy'; }

            if (val) {
                console.log(`${logMsg} (Trong ${val}ms)`);
                setTimeout(() => currentBot.clearControlStates(), val);
            } else {
                console.log(`${logMsg} (Vô cực)`);
            }
            return;
        }

        if (rawInput.startsWith('/')) {
            currentBot.chat(rawInput);
            console.log(`[Bot Đã Gõ Lệnh]: ${rawInput}`);
            return;
        }

        const now = Date.now();
        if (now - lastChatTime < 1500) {
            console.log('>>> [CẢNH BÁO] Chat chậm thôi nha!');
            return;
        }
        lastChatTime = now;
        currentBot.chat(rawInput); 
        console.log(`[Đã Chat]: ${rawInput}`);

    } catch (error) {
        console.log('>>> [Lỗi]:', error.message);
    }
});

createBot();
