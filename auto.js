const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline'); // Kéo thêm module đọc bàn phím

const RECONNECT_DELAY = 240000; // 4 phút vào lại 1 lần

// TẠO WEB SERVER (CHỐNG SLEEP)
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot Fonggggg đang Farm VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

// KHIÊN BẤT TỬ
process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// BIẾN TRẠNG THÁI & NGỦ ĐÔNG
let botState = 'HUB'; 
let currentBot; 
let clickLoop; 
let antiAfkLoop; 
let farmTimeout; 
let isLoggingIn = false; 
let isComboRunning = false; 
let shouldReconnect = true; 
let failCount = 0; 

// ==========================================
// HÀM TỰ ĐỘNG VẨY LA BÀN KHÔNG CẦN NHÌN CHAT
// ==========================================
function startCompassLoop(bot) {
    if (clickLoop) clearInterval(clickLoop);
    bot.setQuickBarSlot(4); 
    console.log('[Hub] Chủ động cầm La bàn lên vẩy...');
    let clickCount = 0;
    clickLoop = setInterval(() => {
        if (botState === 'HUB') {
            bot.activateItem(); 
            clickCount++;
            if (clickCount >= 8) { // Bấm 8 lần (24s) không hiện Menu thì ép Farm
                console.log('[Cứu Hộ] Vẩy La Bàn 24s không thấy Menu! Ép buộc khởi động Farm...');
                clearInterval(clickLoop);
                botState = 'FARMING';
                startFarmingProcess(bot);
            }
        } else {
            clearInterval(clickLoop);
        }
    }, 3000);
}

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
            console.log('[Hub] Đã kết nối server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang đợi load map...');
            
            // Đăng nhập xong chờ 4 giây là TỰ ĐỘNG lôi la bàn ra bấm, không chờ lệnh "bạn sở hữu"
            await sleep(4000);
            if (botState === 'HUB') {
                startCompassLoop(bot);
            }
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // 2. SERVER BẢO TRÌ NÉM VỀ HUB -> TẮT CHẾ ĐỘ CLICK, NẰM CHỜ KÉO
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            if (botState === 'FARMING' || botState === 'HUB') {
                console.log('[Hệ thống] Server bảo trì ném ra Sảnh! NẰM CHỜ SERVER TỰ KÉO LẠI VÀO (Không bấm la bàn)...');
                botState = 'WAIT_AUTO'; 
                isComboRunning = false;
                if (clickLoop) clearInterval(clickLoop);
                if (farmTimeout) clearTimeout(farmTimeout);
                if (antiAfkLoop) clearInterval(antiAfkLoop);
            }
        }

        // 3. CỨ VÀO ĐƯỢC GAME THÌ CHẠY LỆNH FARM (BẮT CẢ DÒNG JOIN LẪN CHAT BOSS ĐỂ DỰ PHÒNG)
        const hasJoinMessage = lowerMsg.includes('vừa tham gia máy chủ') && message.includes(bot.username);
        const hasGameMessage = lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ') || lowerMsg.includes('thế giới') || lowerMsg.includes('thủ lĩnh');
        
        if (botState !== 'FARMING' && botState !== 'WAIT_AUTO' && (hasJoinMessage || hasGameMessage)) {
            console.log(`[Mắt Thần] Đã xác nhận lọt vào Game (Cụm Farm)! Bắt đầu chạy kịch bản múa...`);
            botState = 'FARMING'; 
            
            if (clickLoop) clearInterval(clickLoop);
            if (farmTimeout) clearTimeout(farmTimeout);
            
            farmTimeout = setTimeout(() => startFarmingProcess(bot), 3000);
        }

        // 4. LỖI KẾT NỐI (UNABLE TO CONNECT) -> CLICK LA BÀN LẠI TỪ ĐẦU
        if (lowerMsg.includes('unable to connect') || lowerMsg.includes('không thể kết nối')) {
            if (botState !== 'WAIT_AUTO') { 
                console.log('[Lỗi Server] Bị từ chối vô cụm Farm! Lôi la bàn ra spam tiếp...');
                botState = 'HUB'; 
                isComboRunning = false;
                if (farmTimeout) clearTimeout(farmTimeout);
                startCompassLoop(bot);
            }
        }

        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                bot.chat(`/party join ${match[1]}`);
            }
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                  lowerMsg.includes('slained by') || 
                                  lowerMsg.includes('giết'));
        
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị KS! Nằm im giả chết chờ server kick AFK...');
            shouldReconnect = false; 
        }

        if (message.includes('không thể ngồi trong không khí') || message.includes('không thể nằm trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/lay'); }, 3000);
        }
    });

    bot.on('windowOpen', async (window) => {
        if (botState !== 'HUB') return; 
        botState = 'CLICKING_MENU'; 
        if (clickLoop) clearInterval(clickLoop);

        try {
            await sleep(3000); 
            console.log(`[Menu 1] Nhấp slot 20...`);
            await bot.clickWindow(20, 0, 0); 

            await sleep(2500); 
            console.log(`[Menu 2] Nhấp slot 14...`);
            await bot.clickWindow(14, 0, 0); 
            
            console.log('[Menu] Thành công! Đợi load map xác nhận...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB'; 
            startCompassLoop(bot);
        }
    });

    bot.on('death', async () => {
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        if (clickLoop) clearInterval(clickLoop);
        if (farmTimeout) clearTimeout(farmTimeout);

        if (botState === 'HUB' || botState === 'WAIT_AUTO') {
            console.log('[CẢNH BÁO] Bot chết ở Sảnh! Đang tự động ấn Hồi Sinh (Respawn)...');
            setTimeout(() => { bot.respawn(); }, 2000); 
        } else {
            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác không làm gì cả...');
        }
    });

    bot.on('end', () => {
        if (!shouldReconnect) {
            console.log('[SHUTDOWN] Server đã kick nick ra ngoài do AFK/Bị KS!');
            return; 
        }

        botState = 'HUB'; 
        isLoggingIn = false;
        isComboRunning = false;
        if (antiAfkLoop) clearInterval(antiAfkLoop); 
        if (clickLoop) clearInterval(clickLoop);
        if (farmTimeout) clearTimeout(farmTimeout);

        failCount++; 
        
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng tránh bị Ban...`);
            failCount = 0; 
            setTimeout(createBot, 3600000); 
            return;
        }

        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi ${RECONNECT_DELAY / 60000} phút để vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY); 
    });

    bot.on('kicked', (reason) => {
        console.log(`[SERVER KICK] Lý do: ${reason.toString()}`);
    });

    bot.on('error', err => {});
}


// ==========================================
// KỊCH BẢN DI CHUYỂN BẤT KHẢ XÂM PHẠM CỦA BRO
// TÔI GIỮ NGUYÊN 100% TỪ TRÊN XUỐNG DƯỚI
// ==========================================
async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await sleep(300);
        
        // BẮT ĐẦU ĐÈ SHIFT NGAY TẠI CHỖ (KỊCH BẢN CŨ CỦA BRO)
        bot.setControlState('sneak', true); 
        await randomSleep(100, 110); 
        
        // COMBO TRÁI - PHẢI - PHẢI - PHẢI
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

        await sleep(1000);
        bot.chat('/home');
        await randomSleep(8000, 10000); 
        
        bot.clearControlStates(); 
        await randomSleep(10000, 11000); 
        
        console.log('[Farm] Đã load map bãi farm, chuẩn bị hạ góc nhìn...');
        
        // ==========================================
        // 1. HẠ CHUỘT XUỐNG MỘT TÍ (Khoảng 20 độ)
        // ==========================================
        const currentYaw = bot.entity.yaw;
        const currentPitch = bot.entity.pitch;
        
        // Trong Mineflayer, cộng thêm góc (Radian) vào pitch sẽ làm camera cúi xuống
        const targetPitch = currentPitch - (15 * Math.PI / 180); 
        
        await bot.look(currentYaw, targetPitch, true); 
        await sleep(300); // Đợi 0.3s cho camera gật xuống mượt mà

        // ==========================================
        // 2. LÙI KIỂU D + S LIÊN TỤC TRONG 0.5s
        // ==========================================
        console.log('[Farm] Đang lùi xéo bằng phím D + S trong 0.5 giây...');
        bot.setControlState('left', true);  // Đè phím S
        bot.setControlState('right', true); // Đè phím D
        
        await sleep(500); // Giữ đúng 0.5 giây
        
        bot.clearControlStates(); // Nhả cả 2 phím ra để phanh lại

        // ==========================================
        // 2.5 QUAY TRÁI 30 ĐỘ RỒI ĐI THẲNG 0.3s
        // ========================================

        console.log('[Farm] Quay trái 30 độ và nhích lên 0.3 giây...');
        const currentYaw2 = bot.entity.yaw;
        const targetYaw2 = currentYaw2 + (30 * Math.PI / 180); // + 30 độ là qua trái
        
        // Bẻ cổ sang trái 30 độ, giữ nguyên độ cúi (bot.entity.pitch)
        await bot.look(targetYaw2, bot.entity.pitch, true); 
        await sleep(200); // Đợi 0.2s cho xoay mượt

        bot.setControlState('forward', true); // Bấm phím W đi thẳng
        await sleep(600); // Đi trong đúng 0.3s
        bot.clearControlStates(); // Phanh gấp lại

        await sleep(2000);
        bot.setControlState('back', true); // Bấm phím W đi thẳng
        await sleep(400); // Đi trong đúng 0.3s
        bot.clearControlStates(); // Phanh gấp lại
        
        await sleep(400);
        console.log('[Farm] Đang lùi xéo bằng phím D + S trong 0.5 giây...');
        bot.setControlState('back', true);  // Đè phím S
        bot.setControlState('left', true); // Đè phím D
        
        await sleep(200); // Giữ đúng 0.5 giây
        bot.clearControlStates(); // Nhả cả 2 phím ra để phanh lại
        
        // ==========================================
        // 3. CHỜ KHOẢNG 5 GIÂY RỒI MỚI NGỒI
        // ==========================================
        console.log('[Farm] Đã lùi xong, đứng im thở 5 giây...');
        await sleep(6000);
        
        bot.chat('/sit');
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống và khởi động Auto Kit (10 phút/lần)!');

        failCount = 0; 

        // XÓA BỎ HOÀN TOÀN AUTO KIT
        if (antiAfkLoop) {
            clearInterval(antiAfkLoop);
            antiAfkLoop = null; 
        }
 
        
    } catch (err) {
        console.log('[Farm] Lỗi:', err.message);
    } finally {
        isComboRunning = false; 
    }
}

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', (input) => {
    if (currentBot) {
        currentBot.chat(input); 
        console.log(`[Bạn Đã Chat]: ${input}`);
    } else {
        console.log('[Lỗi] Bot chưa vào game, không chat được!');
    }
});

createBot();
