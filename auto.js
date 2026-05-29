const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

const RECONNECT_DELAY = 200000; 

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
        if (jsonMsg.toAnsi) console.log(jsonMsg.toAnsi());
        else console.log(jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/dn Windvu@2#1#9#30849009630'); 
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
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (ĐÃ KHÓA CỨNG KHI FARM)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        
        // CHỐT CHẶN: Đang farm thì không thèm check túi đồ nữa, tránh lag múa lại!
        if (botState === 'FARMING') return; 

        const items = currentBot.inventory.items();
        const hasCompass = items.some(i => i.name === 'compass');
        const hasItems = items.length > 0;

        if (hasCompass) {
            if (botState === 'FIRST_LOGIN') {
                botState = 'IN_HUB'; 
            }

            if (botState === 'IN_HUB' && !isGUIOpen) {
                console.log('[Hub] Từ ngoài vào Sảnh! Cầm la bàn đục lỗ...');
                currentBot.setQuickBarSlot(4);
                currentBot.activateItem();
            }
        } 
        else if (!hasCompass && hasItems) {
            if (botState === 'FIRST_LOGIN' || botState === 'MAINTENANCE' || botState === 'IN_HUB') {
                console.log('[Mắt Thần] Không thấy la bàn! Server đã kéo vào Game. Bắt đầu múa!');
                botState = 'FARMING';
                isComboRunning = false; 
                startFarmingProcess(currentBot);
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
            console.log('[Menu] Đã click xong! Chờ server load map...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
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
        failCount++;
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 36000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi ${RECONNECT_DELAY/1000} giây để vào lại...`);
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
        await sleep(2000);
        
        bot.chat('/spawn');
        await sleep(3000); 

        console.log('[Farm] Vận nội công Sprint + Nhảy đúng 1 phát...');
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        bot.setControlState('jump', true); 
        await sleep(500);
        bot.setControlState('jump', false); 
        await randomSleep(600, 800); 
        bot.clearControlStates(); 
        console.log('[Farm] Tiếp đất mượt mà, đứng yên lấy hơi chuẩn bị múa...');
        await randomSleep(500, 800);
        
        bot.setControlState('sneak', true); 
        await sleep(300); 
        bot.swingArm('right'); 
        await sleep(200);
        bot.activateItem(); 
        await sleep(200);
        bot.setControlState('sneak', false); 
        await sleep(5000); 
        bot.setControlState('forward', true); 
        await sleep(500);
        bot.clearControlStates(); 
        await sleep(6000); 

        bot.chat('/home');
        await sleep(5000); 
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
