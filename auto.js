const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

const RECONNECT_DELAY = 240000;

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot đang Farm VIP Pro!'));
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
            console.log('[Hệ Thống] Phát hiện Bảo Trì/Kick! Đang nằm chờ server tự kéo vào (Tắt tự động la bàn)...');
            botState = 'MAINTENANCE'; 
            isComboRunning = false;
            isGUIOpen = false;
            if (antiAfkLoop) clearInterval(antiAfkLoop);
        }
    });

    // ==========================================
    // MẮT THẦN ĐỌC TÚI ĐỒ (ĐÃ FIX LỖI SPAM VÒNG LẶP)
    // ==========================================
    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;

        // Đếm số lượng đồ trong túi (Thanh Hotbar)
        const itemCount = currentBot.inventory.items().length;

        // 1. NẾU 9 Ô ĐỒ ĐỀU FULL (>= 8 món) -> CHẮC CHẮN ĐANG Ở TRONG GAME
        if (itemCount >= 8) {
            // SỬA LỖI SPAM: Chỉ kích hoạt múa nếu trạng thái HIỆN TẠI không phải là FARMING
            if (botState !== 'FARMING') {
                botState = 'FARMING'; // Chốt cửa ngay lập tức
                console.log('[Mắt Thần] Thấy thanh đồ FULL! Xác nhận đã vào Cụm Farm. Bắt đầu múa!');
                startFarmingProcess(currentBot);
            }
        }
        // 2. NẾU ĐỒ TRỐNG TRƠN (<= 3 món, chỉ có la bàn) -> ĐANG Ở HUB
        else if (itemCount > 0 && itemCount <= 3) {
            // Nếu lỡ bị server đá từ bãi Farm về lại Hub thì reset trạng thái để nó biết đường vẩy la bàn
            if (botState === 'FARMING') {
                botState = 'FIRST_LOGIN';
            }

            // Chỉ vẩy la bàn nếu vô từ NGOÀI (FIRST_LOGIN)
            if (botState === 'FIRST_LOGIN') {
                if (!isGUIOpen) {
                    console.log('[Hub] Đang ở sảnh! Cầm la bàn đục lỗ...');
                    currentBot.setQuickBarSlot(4);
                    currentBot.activateItem();
                }
            } 
            // Nếu là MAINTENANCE thì tuyệt đối KHÔNG làm gì cả, nằm chờ server tự kéo vô đồ full thì tự múa
            else if (botState === 'MAINTENANCE') {
                // Nằm im thin thít
            }
        }
    }, 4000); // 4 giây liếc túi đồ 1 lần cho đỡ nặng server

    // ==========================================
    // FIX LỖI SPAM MENU GUI
    // ==========================================
    bot.on('windowOpen', async (window) => {
        if (botState === 'MAINTENANCE') return; // Bảo trì cấm đụng
        if (isGUIOpen) return; // Đang click dở thì không mở thêm tab mới
        
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
            isGUIOpen = false; // Nhả khóa ra
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
        botState = 'FIRST_LOGIN'; // Reset lại trạng thái ban đầu khi rớt mạng
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

// ==========================================
// KỊCH BẢN MÚA BẤT KHẢ XÂM PHẠM (GIỮ NGUYÊN 100%)
// ==========================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.chat('/party quit'); await sleep(1500);
        bot.chat('/party join 18110998125'); await sleep(2000);
        
        bot.setQuickBarSlot(0); await randomSleep(100, 110);
        
        bot.setControlState('sneak', true); await randomSleep(100, 110); 
        bot.swingArm('right'); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.activateItem(); await randomSleep(100, 110);
        bot.setControlState('sneak', false); 

        bot.chat('/spawn'); await sleep(6000); 

        bot.setControlState('forward', true);
        bot.setControlState('sprint', true);
        
        for(let i=0; i<3; i++) {
            bot.setControlState('jump', true);
            await sleep(400);
            bot.setControlState('jump', false);
            await sleep(1100);
        }
        await sleep(1600);
        bot.clearControlStates(); 
        
        console.log('[Farm] Đang lùi xéo...');
        bot.setControlState('back', true); 
        bot.setControlState('left', true); 
        await sleep(500); 
        bot.clearControlStates(); 

        await sleep(5000);
        bot.chat('/home');
        await sleep(6000); 
        bot.chat('/lay');
        
        console.log('[Farm] Đã đến bãi, nằm nghỉ!');

        if (antiAfkLoop) clearInterval(antiAfkLoop);
        antiAfkLoop = setInterval(() => {
            if (botState === 'FARMING') bot.chat('/kit tanthu');
        }, 1200000); 

    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.on('line', (input) => { if (currentBot) currentBot.chat(input); });

createBot();
