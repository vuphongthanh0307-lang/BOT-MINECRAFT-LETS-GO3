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
app.get('/', (req, res) => res.send('Bot Cần Thủ Conchohieungu đang Câu Cá!'));
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
let isSonarKick = false; // BẢO BỐI VƯỢT ẢI SONAR

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'FaiDepTrong', // Nick cần thủ
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
            bot.chat('/dn Windvu2193'); // Mật khẩu ông yêu cầu
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
            botState = 'FIRST_LOGIN';
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // 1. TỰ ĐỘNG GIẢI CAPTCHA
        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        // 1.5 LÌ LỢM ĐĂNG NHẬP
        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn Windvu2193'), 1500); 
        }

        // ==========================================
        // BƯỚC 1: NHẬN DIỆN SONAR ĐANG QUÉT
        // ==========================================
        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im như tượng chờ nó cấp giấy chứng nhận...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; // Bật cờ dự phòng
        }

        // --- BỘ LỌC TỰ ĐỘNG JOIN PARTY ---
        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời từ anh em: ${match[1]}! Đang quất lệnh join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        // 2. BẢO TRÌ/KICK -> ÉP VỀ SẢNH ĐỂ BẤM LA BÀN
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện bị ném ra Sảnh! Tự động lôi la bàn ra đục lỗ vô lại...');
            botState = 'IN_HUB'; 
            isComboRunning = false; 
        }

        // 3. RÚT LUI NẾU BỊ KS/GIẾT
        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị Giết! Nằm im giả chết chờ server kick AFK...');
            botState = 'KILLED'; // Dừng câu cá nếu chết
        }

        // ==============================================================
        // MẮT THẦN VÀO GAME
        // ==============================================================
        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {
            if (botState !== 'FARMING') {
                console.log(`[Mắt Thần] Thấy thông báo vô game! ĐÃ LỌT VÀO CỤM CHƠI! Khóa Hub, Xách cần đi câu!`);
                botState = 'FARMING';
                isComboRunning = false; 
                startFishingProcess(bot);
            }
        }
    });

    // ==========================================
    // LA BÀN CHỈ DÙNG ĐỂ CLICK HUB, CẤM DÙNG TRONG GAME
    // ==========================================
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
        if (isGUIOpen || botState === 'MAINTENANCE' || botState === 'WAIT_AUTO') return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ server bế vào cụm...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    // ==========================================
    // BƯỚC 2: ĐỌC BẢNG KICK XÁC MINH THÀNH CÔNG
    // ==========================================
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
            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Đang tự động ấn Hồi Sinh...');
            setTimeout(() => bot.respawn(), 2000);
        } else {
            console.log('[CẢNH BÁO] Bot bị giết! Nằm phơi xác...');
        }
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã bị văng hẳn khỏi cụm máy chủ!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 

        // ==========================================
        // BƯỚC 3: ĐẾM NGƯỢC 12 GIÂY CHO RENDER KHỎI NGỦ
        // ==========================================
        if (isSonarKick) {
            isSonarKick = false; // Trả lại cờ
            failCount = 0; // Tẩy trắng rớt mạng
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
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 40000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==================================================
// KỊCH BẢN CẦN THỦ (AUTO CÂU CÁ)
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

        // --- CÚI MẶT XUỐNG HỒ (Cúi 15 độ) ---
        const currentYaw = bot.entity.yaw;
        const targetPitch = -15 * Math.PI / 180; 
        await bot.look(currentYaw, targetPitch, false); 
        await sleep(1000);

        console.log('[Câu Cá] Tới hồ rồi! Bắt đầu móc giun...');

        // VÒNG LẶP CÂU CÁ
        while (botState === 'FARMING') {
            // Tìm cần câu trong túi
            const fishingRod = bot.inventory.items().find(item => item.name === 'fishing_rod');
            if (!fishingRod) {
                console.log('>>> [Hết Cần] Bị gãy cần hoặc chưa có cần câu! Đứng ngáp chờ... (Kiểm tra túi đồ)');
                await sleep(10000);
                continue; 
            }

            // Cầm cần lên
            await bot.equip(fishingRod, 'hand');

            try {
                console.log('[Câu Cá] 🎣 Đang quăng mồi... Chờ cá cắn!');
                
                // bot.fish() tự động: quăng -> chờ phao lún -> giật cần
                await bot.fish();
                
                console.log('[Câu Cá] 🐟 LỤM CÁ! Tiếp tục quăng...');
                failCount = 0; 
                
                await sleep(1000); // Thở 1 giây trước khi ném mẻ mới
            } catch (err) {
                console.log('[Câu Cá] Rớt mồi hoặc lỗi (Có thể do mạng lag). Quăng lại nha!', err.message);
                await sleep(2000);
            }
        }

    } catch (err) {
        console.log('[Câu Cá] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

// ==========================================
// TÍNH NĂNG VÔ LĂNG LÁI XE VÀ CHAT
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
        // --- 1. LỆNH DỪNG LẠI HOẶC ĐỨNG DẬY ---
        if (cmd === '/stop') { 
            currentBot.clearControlStates(); 
            console.log('>> [WASD] PHANH GẤP! Đã dừng mọi di chuyển.'); 
            return; 
        }
        if (cmd === '/stand') { 
            currentBot.setControlState('sneak', true); 
            setTimeout(() => currentBot.setControlState('sneak', false), 300); 
            console.log('>> [HÀNH ĐỘNG] Nhấn Shift để ĐỨNG DẬY!'); 
            return; 
        }

        // --- 2. LỆNH QUAY CAMERA THEO ĐỘ ---
        if (cmd === '/trai' || cmd === '/trái') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw + (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay sang TRÁI ${angle} độ`); return; 
        }
        if (cmd === '/phai' || cmd === '/phải') { 
            const angle = val !== null ? val : 90;
            await currentBot.look(currentBot.entity.yaw - (angle * Math.PI / 180), currentBot.entity.pitch, false); 
            console.log(`>> [CAMERA] Quay sang PHẢI ${angle} độ`); return; 
        }
        if (cmd === '/sau') { 
            await currentBot.look(currentBot.entity.yaw + Math.PI, currentBot.entity.pitch, false); 
            console.log('>> [CAMERA] Quay mặt 180 độ về PHÍA SAU'); return; 
        }
        if (cmd === '/len' || cmd === '/lên') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.max(-Math.PI/2, currentBot.entity.pitch - (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Ngước nhìn LÊN ${angle} độ`); return; 
        }
        if (cmd === '/xuong' || cmd === '/xuống') { 
            const angle = val !== null ? val : 45;
            const newPitch = Math.min(Math.PI/2, currentBot.entity.pitch + (angle * Math.PI / 180));
            await currentBot.look(currentBot.entity.yaw, newPitch, false); 
            console.log(`>> [CAMERA] Cúi nhìn XUỐNG ${angle} độ`); return; 
        }

        // --- 3. LỆNH DI CHUYỂN KẾT HỢP ---
        const moveKeys = cmd.replace('/', '');
        if (/^(w|a|s|d|j|sh)+$/.test(moveKeys)) {
            currentBot.clearControlStates();
            let logMsg = ">> [WASD] Di chuyển:";

            if (moveKeys.includes('w')) { currentBot.setControlState('forward', true); logMsg += ' Tiến'; }
            if (moveKeys.includes('s')) { currentBot.setControlState('back', true); logMsg += ' Lùi'; }
            if (moveKeys.includes('a')) { currentBot.setControlState('left', true); logMsg += ' Sang Trái'; }
            if (moveKeys.includes('d')) { currentBot.setControlState('right', true); logMsg += ' Sang Phải'; }
            if (moveKeys.includes('sh')) { currentBot.setControlState('sneak', true); logMsg += ' (Đè Shift)'; }
            if (moveKeys.includes('j')) { currentBot.setControlState('jump', true); logMsg += ' + Nhảy'; }

            if (val) {
                console.log(`${logMsg} (Trong ${val}ms)`);
                setTimeout(() => {
                    currentBot.clearControlStates();
                    console.log('>> [WASD] Đã dừng!');
                }, val);
            } else {
                console.log(`${logMsg} (Vô cực. Gõ /stop để dừng)`);
            }
            return;
        }

        // --- 4. LỆNH IN-GAME ---
        if (rawInput.startsWith('/')) {
            currentBot.chat(rawInput);
            console.log(`[Bot Đã Gõ Lệnh]: ${rawInput}`);
            return;
        }

        // --- 5. CHAT BÌNH THƯỜNG ---
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
