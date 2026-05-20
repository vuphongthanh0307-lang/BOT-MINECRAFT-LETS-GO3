const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); 

const RECONNECT_DELAY = 240000; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// 3 TRẠNG THÁI RÕ RÀNG: FIRST_LOGIN (Từ ngoài vô), MAINTENANCE (Bảo trì), FARMING (Đang múa)
let botState = 'FIRST_LOGIN'; 
let currentBot; 
let antiAfkLoop; 
let isLoggingIn = false; 
let isComboRunning = false; 
let isGUIOpen = false; // KHÓA CHỐNG SPAM CLICK MENU

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5554', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 90000,
        respawn: false 
    });

    currentBot = bot; 

    // ==========================================
    // CÁI MỒM CỦA BOT (IN LOG GAME RA MÀN HÌNH BẰNG MÀU)
    // ==========================================
    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) {
            console.log(jsonMsg.toAnsi());
        } else {
            console.log(jsonMsg.toString());
        }
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, đang đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // NẾU THẤY BẢO TRÌ -> CHUYỂN SANG CHẾ ĐỘ NẰM IM CHỜ KÉO, TẮT MÚA
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện Bảo Trì! Đang nằm chờ server tự kéo vào (Tắt tự động la bàn)...');
            botState = 'MAINTENANCE'; 
            isComboRunning = false;
            isGUIOpen = false;
            if (antiAfkLoop) clearInterval(antiAfkLoop);
        }
        
        // KIỂM TRA BỊ KS MẠNG
        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Nằm im chờ kick AFK...');
        }
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (Không xài đọc Chat nữa)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;

        const itemCount = currentBot.inventory.items().length;

        // 1. NẾU 9 Ô ĐỒ ĐỀU FULL (>= 8 món) -> CHẮC CHẮN ĐANG Ở TRONG GAME
        if (itemCount >= 8) {
            // Chốt chặn cứng: Chỉ múa nếu trạng thái chưa phải FARMING
            if (botState !== 'FARMING') {
                botState = 'FARMING';
                console.log('[Mắt Thần] Thấy thanh đồ FULL! Xác nhận đã vào Cụm Farm. Bắt đầu múa!');
                startFarmingProcess(currentBot);
            }
        }
        // 2. NẾU ĐỒ TRỐNG TRƠN (<= 3 món, có la bàn) -> ĐANG Ở HUB
        else if (itemCount > 0 && itemCount <= 3) {
            // Chỉ vẩy la bàn nếu vô từ NGOÀI (FIRST_LOGIN)
            if (botState === 'FIRST_LOGIN') {
                if (!isGUIOpen && !isComboRunning) {
                    console.log('[Hub] Đang ở sảnh! Cầm la bàn đục lỗ...');
                    currentBot.setQuickBarSlot(4);
                    currentBot.activateItem();
                }
            } 
            // Nếu là MAINTENANCE thì tuyệt đối KHÔNG làm gì cả, nằm chờ server tự kéo vô
        }
    }, 3000); 

    // ==========================================
    // SỰ KIỆN CLICK MENU GUI
    // ==========================================
    bot.on('windowOpen', async (window) => {
        if (botState === 'MAINTENANCE') return; 
        if (isGUIOpen) return; 
        
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
        isComboRunning = false;
        bot.clearControlStates();
        if (botState !== 'FARMING') setTimeout(() => bot.respawn(), 2000);
    });

    bot.on('end', () => {
        isLoggingIn = false;
        isComboRunning = false;
        botState = 'FIRST_LOGIN'; // Reset về đăng nhập ban đầu
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==========================================
// KỊCH BẢN DI CHUYỂN MỚI NHẤT CỦA ÔNG (GIỮ NGUYÊN)
// ==========================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await randomSleep(100, 110);

        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY TIẾP THEO KỊCH BẢN MỚI CỦA ÔNG
        await sleep(25000);
        bot.chat('/spawn');
        await randomSleep(5000, 6000); 

        // ==========================================
        // BƯỚC MỚI: CHẠY THẲNG + SPRINT + NHẢY 3 PHÁT TRONG 5 GIÂY
        // ==========================================
        console.log('[Farm] Tới Spawn rồi, cắm đầu chạy thẳng 5 giây và nhảy 3 phát...');
        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        // Nhảy phát 1
        bot.setControlState('jump', true); 
        await sleep(400); 
        bot.setControlState('jump', false); 
        await sleep(1100); 

        // Nhảy phát 2
        bot.setControlState('jump', true); 
        await sleep(400); 
        bot.setControlState('jump', false); 
        await sleep(1100); 

        // Nhảy phát 3
        bot.setControlState('jump', true); 
        await sleep(400); 
        bot.setControlState('jump', false); 
        
        await sleep(1600); 

        bot.clearControlStates(); 
        console.log('[Farm] Đã chạy xong 5 giây, phanh lại đứng chờ...');
        console.log('[Farm] múa tay...');
        // BẮT ĐẦU ĐÈ SHIFT VÀ MÚA TAY NHANH
        bot.setControlState('sneak', true); 
        await randomSleep(100, 110); 
        
        bot.swingArm('right'); 
        await randomSleep(100, 110);
        bot.activateItem(); 
        await randomSleep(100, 110);
        bot.activateItem(); 
        await randomSleep(100, 110);
        bot.activateItem(); 
        await randomSleep(100, 110);

        // NHẢ SHIFT NGAY TẠI ĐÂY
        bot.setControlState('sneak', false); 
        await sleep(2000);
        console.log('[Farm] tiến tới...');
        bot.setControlState('forward', true);
        await sleep(500);
        bot.clearControlStates();
        await sleep(2000);
        console.log('[Farm] Lại home...');
        bot.chat('/home'); 
        await randomSleep(5000, 6000); 
        
        // BƯỚC CUỐI CÙNG: NGỒI (NẰM) XUỐNG
        bot.chat('/lay');
        console.log('[Farm] Đã đến bãi, nằm sải lai nhập định!');

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        // Tui tháo cái isComboRunning = false ra để nó KHÔNG lặp lại lần 2 nhé
    }
}

// ==========================================
// TÍNH NĂNG CHAT TỪ REPLIT VÀO GAME
// ==========================================
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => { 
    if (currentBot) {
        currentBot.chat(input); 
        console.log(`[Bạn Đã Chat]: ${input}`);
    } 
});

createBot();
