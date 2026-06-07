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
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
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
        username: 'Fonggggg', 
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
            bot.chat('/dn Windvu@2_1_9_30849009630'); 
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
            setTimeout(() => bot.chat('/dn Windvu@2_1_9_30849009630'), 1500); 
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

        // 2. BẢO TRÌ/KICK -> NẰM CHỜ
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện Bảo Trì/Kick! Đang nằm chờ server tự kéo...');
            botState = 'MAINTENANCE'; 
            isComboRunning = false; 
        }

        // 3. RÚT LUI NẾU BỊ KS
        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Nằm im giả chết chờ server kick AFK...');
        }
        
        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
        }

        // ==============================================================
        // MẮT THẦN VÀO GAME (CHUẨN 100% TỪ HÌNH ẢNH CỦA ÔNG)
        // ==============================================================
        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {
            if (botState !== 'FARMING') {
                console.log(`[Mắt Thần] Thấy thông báo: ${message}`);
                console.log('[Mắt Thần] ĐÃ LỌT VÀO CỤM FARM AN TOÀN! Khóa Hub, Bắt đầu múa!');
                botState = 'FARMING';
                isComboRunning = false; 
                startFarmingProcess(bot);
            }
        }
    });

    // ==========================================
    // LA BÀN CHỈ DÙNG ĐỂ CLICK HUB, CẤM DÙNG ĐỂ MÚA
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        
        if (botState === 'FARMING') return; 

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
        if (isGUIOpen || botState === 'MAINTENANCE') return; 
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
            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác...');
        }
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã bị văng hẳn khỏi cụm máy chủ!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 

        // ==========================================
        // BƯỚC 3: ĐẾM NGƯỢC 12 GIÂY CHO RENDER KHỎI NGỦ + SERVER KỊP LƯU IP
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
                    console.log(`[Anti-Bot] Hết giờ! Phi thẳng vô cụm lượm lúa!!!`);
                    createBot();
                }
            }, 1000); // Lặp lại mỗi 1 giây
            return; 
        }

        failCount++;
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 30000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==================================================
// KỊCH BẢN MÚA CỦA PHÁP SƯ (TÔI KHÔNG ĐỤNG 1 CHỮ NÀO)
// ==================================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await sleep(50000);
        
        bot.chat('/spawn');
        await sleep(5000); 

        console.log('[Farm] Tới Spawn, bước sang ngang 1 giây né đám đông...');
        
        bot.setControlState('right', true); 
        await sleep(1000); 
        
        bot.clearControlStates(); 
        await sleep(300);

        console.log('[Farm] Lia chuột xéo trái 45 độ và nhảy tới 1 giây...');
        
        const currentYaw = bot.entity.yaw;
        const targetYaw = currentYaw + (45 * Math.PI / 180); 
        const currentPitch = bot.entity.pitch; 
        
        await bot.look(targetYaw, currentPitch, true); 
        await sleep(200); 
        
        bot.setControlState('forward', true); 
        bot.setControlState('sprint', true); 
        bot.setControlState('jump', true); 

        await randomSleep(1000, 1200); 
        
        bot.clearControlStates(); 
        console.log('[Farm] Tiếp đất mượt mà, đứng yên lấy hơi chuẩn bị múa...');
        await randomSleep(500, 800);
        
        bot.setControlState('sneak', true); 
        await sleep(300); 
        
        bot.swingArm('right'); 
        await sleep(200);
        bot.activateItem(); 
        await sleep(200);
        bot.activateItem(); 
        await sleep(200);
        bot.activateItem(); 
        await sleep(200);

        bot.setControlState('sneak', false); 

        await randomSleep(4000, 10000); 
        bot.setControlState('forward', true); 
        await sleep(500);
        bot.clearControlStates(); 
        await sleep(6000); 

        bot.chat('/home'); 
        await randomSleep(10000, 12000); 
        
        console.log('[Farm] Đã load map bãi farm, chuẩn bị nhích bước tới...');
        bot.clearControlStates(); 
        
        console.log('[Farm] Đang lùi xéo bằng phím D + S trong 0.5 giây...');
        bot.setControlState('forward', true);  
        bot.setControlState('right', true); 
        
        await sleep(200); 
        bot.clearControlStates(); 
        await sleep(200); 
        ;;
        await sleep(8000);
        bot.chat('/sit');

        const finalYaw = bot.entity.yaw;
        const finalPitch = bot.entity.pitch - (20 * Math.PI / 180); 
        
        await bot.look(finalYaw, finalPitch, true); 
        await sleep(300);
        
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống nhập định!');
        failCount = 0; 

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

// ==========================================
// TÍNH NĂNG CHAT TỪ REPLIT VÀO GAME
// ==========================================
let lastChatTime = 0;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (currentBot) {
        const now = Date.now();
        if (now - lastChatTime < 1500) {
            console.log('>>> [CẢNH BÁO] Gõ chậm thôi! Kẻo server nó khóa mõm!');
            return;
        }
        lastChatTime = now;
        currentBot.chat(input); 
        console.log(`[Bạn Đã Chat]: ${input}`);
    } else {
        console.log('[Lỗi] Bot chưa vào game, không chat được!');
    }
});

createBot();
