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
let isLoggingIn = false; 
let isComboRunning = false; 
let shouldReconnect = true; 
let failCount = 0; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'winlxag5554', 
        version: '1.12.2',
        viewDistance: 'tiny', 
        checkTimeoutInterval: 90000,
        respawn: false // Giữ false để tự ấn Respawn khi kẹt Hub
    });

    currentBot = bot; 

    // ==========================================
    // MẮT THẦN: SOI CHAT SERVER
    // ==========================================
    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) {
            console.log(jsonMsg.toAnsi());
        } else {
            console.log(jsonMsg.toString());
        }
    });

    bot.on('spawn', async () => {
        if (botState === 'HUB' && !isLoggingIn) {
            isLoggingIn = true;
            console.log('[Hub] Đã vào server, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/l Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang dỏng tai nghe ngóng Server phản hồi...');
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        // ==========================================
        // MẮT THẦN 3.0: CHỐNG NGÁO LA BÀN
        // ==========================================
        if (botState === 'HUB' && lowerMsg.includes('bạn sở hữu')) {
            console.log('[Mắt Thần] Bắt được chữ "Bạn sở hữu"! Đích thị là đang ở Sảnh (Hub).');
            console.log('[Hub] Cầm La bàn lên tay và đục lỗ vô cụm...');
            
            bot.setQuickBarSlot(4); 
            
            let clickCount = 0;
            if (clickLoop) clearInterval(clickLoop);
            clickLoop = setInterval(() => {
                if (botState === 'HUB') {
                    console.log(`[Hub] Đang click La bàn...`);
                    bot.activateItem(); 
                    clickCount++;

                    // Nếu kẹt la bàn 15s không vô được, ép khởi động Farm
                    if (clickCount >= 6) {
                        console.log('[Cứu Hộ] Click 15s không có Menu! Hủy vòng lặp, ép khởi động Farm...');
                        clearInterval(clickLoop);
                        botState = 'FARMING';
                        startFarmingProcess(bot);
                    }
                } else {
                    clearInterval(clickLoop);
                }
            }, 2500); 
        }

        if (botState === 'HUB' && (lowerMsg.includes('boss') || lowerMsg.includes('tài xỉu') || lowerMsg.includes('nô lệ') || lowerMsg.includes('thế giới') || lowerMsg.includes('thủ lĩnh'))) {
            console.log('[Mắt Thần] Nhận diện tin nhắn Game Farm! Bỏ qua La Bàn, tiến hành chạy bãi...');
            botState = 'FARMING';
            if (clickLoop) clearInterval(clickLoop);
            setTimeout(() => startFarmingProcess(bot), 3000);
        }

        // ==========================================
        // CẢM BIẾN CHỐNG KẸT HUB
        // ==========================================
        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            if (botState === 'FARMING') {
                console.log('[Hệ thống] Bị ném về Sảnh! Reset trạng thái để tự động đục lỗ vào lại...');
                botState = 'HUB';
                isLoggingIn = false; 
                isComboRunning = false;
                if (antiAfkLoop) clearInterval(antiAfkLoop);
                if (clickLoop) clearInterval(clickLoop);
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

        if (message.includes('không thể ngồi trong không khí')) {
            setTimeout(() => { if (botState === 'FARMING') bot.chat('/sit'); }, 3000);
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
            
            botState = 'FARMING'; 
            console.log('[Menu] Thành công! Đợi 15s load map...');
            setTimeout(() => startFarmingProcess(bot), 15000); 
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
            botState = 'HUB'; 
        }
    });

    // ==========================================
    // SỰ KIỆN TỬ TRẬN: TỰ RESPAWN NẾU Ở HUB
    // ==========================================
    bot.on('death', async () => {
        isComboRunning = false; 
        bot.clearControlStates(); 
        if (antiAfkLoop) clearInterval(antiAfkLoop);
        if (clickLoop) clearInterval(clickLoop);

        if (botState === 'HUB') {
            console.log('[CẢNH BÁO] Bot chết ở Sảnh (Hub)! Đang tự động ấn Hồi Sinh (Respawn)...');
            setTimeout(() => { bot.respawn(); }, 2000); 
        } else {
            console.log('[CẢNH BÁO] Bot bị giết trong cụm Farm! Nằm phơi xác không làm gì cả...');
        }
    });

    bot.on('end', () => {
        if (!shouldReconnect) {
            console.log('[SHUTDOWN] Server đã kick nick ra ngoài do AFK/Bị KS!');
            if (antiAfkLoop) clearInterval(antiAfkLoop); 
            if (clickLoop) clearInterval(clickLoop);
            return; 
        }

        botState = 'HUB'; 
        isLoggingIn = false;
        isComboRunning = false;
        if (antiAfkLoop) clearInterval(antiAfkLoop); 
        if (clickLoop) clearInterval(clickLoop);

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

async function startFarmingProcess(bot) {
    if (isComboRunning) return; 
    isComboRunning = true;

    try {
        bot.setQuickBarSlot(0); 
        await randomSleep(7000, 9000);
        
        // BAY ĐẾN BÃI TRƯỚC RỒI MỚI MÚA TAY
        bot.chat('/spawn');
        await randomSleep(8000, 10000); 

        // ==========================================
        // BƯỚC MỚI: CTRL + W CHẠY THỤC MẠNG KÈM NHẢY TRONG 4 GIÂY
        // ==========================================
        console.log('[Farm] Tới Spawn rồi, Sprint-Jump phi lên phía trước 4 giây...');
        
        // Bật cả 2 phím: W (Tiến lên) và Ctrl (Chạy nhanh)
        bot.setControlState('forward', true); 
        bot.setControlState('sprint', true); 

        // Hàm giúp bot nhảy lên 1 cái
        const doJump = () => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 250); 
        };
        
        // Lên lịch nhảy 3 nhịp xen kẽ nhau cho gọn trong 4 giây
        setTimeout(doJump, 400);  // Nhịp 1: 0.4s
        setTimeout(doJump, 1600); // Nhịp 2: 1.6s
        setTimeout(doJump, 2800); // Nhịp 3: 2.8s
        
        // Chạy tổng cộng 4 giây (4000ms đến 4200ms)
        await randomSleep(4000, 4200); 
        
        // Nhả toàn bộ phím ra để phanh gấp
        bot.clearControlStates(); 
        await randomSleep(500, 800); // Khựng lại thở một nhịp rồi mới lom khom múa tay
        
        // ==========================================
        // BẮT ĐẦU ĐÈ SHIFT VÀ MÚA TAY
        // ==========================================
        bot.setControlState('sneak', true); 
        await randomSleep(800, 1200); 
        
        bot.swingArm('right'); 
        await randomSleep(600, 800);
        bot.activateItem(); 
        await randomSleep(600, 700);
        bot.activateItem(); 
        await randomSleep(600, 700);
        bot.activateItem(); 
        await randomSleep(600, 700);

        // NHẢ SHIFT NGAY TẠI ĐÂY
        bot.setControlState('sneak', false); 

        await randomSleep(8000, 10000); 
        
        bot.clearControlStates(); 
        await randomSleep(2000, 3000); 

        bot.chat('/home'); // Xong combo thì bay về bãi
        await randomSleep(10000, 12000); 
        
        console.log('[Farm] Đã load map bãi farm, chuẩn bị nhích bước tới...');
        
        // BƯỚC CUỐI CÙNG: NHÍCH LÊN TRƯỚC RỒI MỚI NGỒI
        bot.setControlState('forward', true); 
        await sleep(500); 
        bot.clearControlStates(); 
        
        await sleep(1000);
        bot.chat('/sit');
        console.log('[Farm] Đã nhích đúng vị trí, ngồi xuống nhập định (Không có Auto Kit)!');

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

// ==========================================
// TÍNH NĂNG CHAT TỪ REPLIT VÀO GAME
// ==========================================
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
