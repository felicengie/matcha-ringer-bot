// bot.js
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');
const fs = require('fs').promises;
require('dotenv').config();
const { scrapeWebsite, isInStock, extractPrice } = require('./scraper');
const vendors = require('./vendors');

class MatchaBot {
    constructor(token) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });
        
        this.token = token;
        this.vendors = vendors; // Use the imported vendors
    
        this.stockData = new Map();
        this.userRoles = new Map();
        this.init();
    }

    async init() {
        await this.loadStockData();

        // Sync new products to stockData
        let updated = false;
        for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
            for (const product of vendor.products) {
                for (const supplier of product.suppliers) {
                    const productKey = `${vendorKey}_${product.name}_${supplier.name}`;
                    if (!this.stockData.has(productKey)) {
                        this.stockData.set(productKey, false);
                        updated = true;
                    }
                }
            }
        }
        if (updated) {
            await this.saveStockData();
            console.log('📝 Synced new products to stock_data.json');
        }

        await this.setupEventHandlers();
        await this.client.login(this.token);
    }

    async loadStockData() {
        try {
            const data = await fs.readFile('stock_data.json', 'utf8');
            const stockArray = JSON.parse(data);
            this.stockData = new Map(stockArray);
        } catch (error) {
            console.log('No existing stock data found, starting fresh');
            this.stockData = new Map();
        }
    }

    async saveStockData() {
        const stockArray = Array.from(this.stockData.entries());
        await fs.writeFile('stock_data.json', JSON.stringify(stockArray, null, 2));
    }

    setupEventHandlers() {
        if (this._eventHandlersSetup) return;
        this._eventHandlersSetup = true;

        this.client.once('clientReady', () => {
            console.log(`🍵 Matcha Bot is online as ${this.client.user.tag}!`);
            this.setupChannels();
            this.startMonitoring();
            this.client.on('messageCreate', this.handleMessageCreate.bind(this));
        });

        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isButton()) {
                    await this.handleRoleToggle(interaction);
                }
            } catch (error) {
                console.error('Error handling interaction:', error);
                try {
                    await message.reply('❌ An error occurred. Please check bot permissions.');
                } catch (replyError) {
                    console.error('Could not send error reply:', replyError);
                }
            }
        });
    }

    async handleMessageCreate(message) {
        if (message.author.bot) return;
        
        try {
            // Added: to auto update the role selector without having to delete the bot chat.
            if (message.content === '!refresh-selector' && message.member.permissions.has('MANAGE_ROLES')) {
                const chooseVendorsChannel = message.guild.channels.cache.find(ch => ch.name === '🛎️│choose-vendors');
                if (chooseVendorsChannel) {
                    // Delete old selector
                    const messages = await chooseVendorsChannel.messages.fetch({ limit: 10 });
                    const oldSelector = messages.find(msg =>
                        msg.author.id === this.client.user.id &&
                        msg.embeds.length &&
                        msg.embeds[0].title === '🍵 Choose Your Matcha Vendor Alerts'
                    );
                    
                    if (oldSelector) await oldSelector.delete();
                    
                    // Create new one
                    await this.sendRoleSelector(chooseVendorsChannel);
                    await message.react('✅');
                }
            }
            if (message.content === '!matcha-status') {
                console.log('📊 Received !matcha-status command');
                await this.sendStatusUpdate(message.channel);
            }

            if (message.content === '!matcha-test') {
                console.log('🧪 Received !matcha-test command');
                await message.reply('🍵 Bot is working! To get started, visit <#1408017992393953310> and select which vendors you want alerts for.');
            }

            if (message.content === '!matcha-check-now') {
                console.log('🔍 Manual stock check requested');
                await message.reply('🔍 Checking stocks now... This may take a moment.');
                
                let checkedCount = 0;
                let stockReport = '📊 **Stock Check Results:**\n\n';
                
                for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
                    stockReport += `**${vendor.name}:**\n`;
                    for (const product of vendor.products) {
                        for (const supplier of product.suppliers) {
                            const stockInfo = await this.checkStock(supplier, product);
                            checkedCount++;
                            const status = stockInfo.inStock ? '🟢 In Stock' : '🔴 Out of Stock';
                            const priceInfo = stockInfo.price !== 'Check website' ? ` - ${stockInfo.price}` : '';
                            stockReport += `• ${product.name} (${supplier.name}): ${status}${priceInfo}\n`;

                            console.log(`${status} - ${supplier.name} - ${product.name}: ${stockInfo.price}`);
                        }
                    }
                    stockReport += '\n';
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay between vendors
                }
                
                // Split message if too long
                if (stockReport.length > 2000) {
                    const chunks = stockReport.match(/[\s\S]{1,1900}/g);
                    for (const chunk of chunks) {
                        await message.channel.send(chunk);
                    }
                } else {
                    await message.channel.send(stockReport);
                }
            }

            if (message.content.startsWith('!matcha-test-url ')) {
                const url = message.content.replace('!matcha-test-url ', '').trim();
                console.log(`🧪 Testing specific URL: ${url}`);
                
                // Send initial loading message
                const loadingMsg = await message.reply('🔍 Analyzing website... This may take a few seconds.');
                
                try {
                    const result = await scrapeWebsite(url);
                    
                    // Determine stock status
                    const stockStatus = isInStock(result);
                    const stockEmoji = stockStatus === true ? '🟢' : stockStatus === false ? '🔴' : '❓';
                    const stockText = stockStatus === true ? 'In Stock' : stockStatus === false ? 'Out of Stock' : 'Unknown';
                    
                    // Extract price
                    const price = extractPrice(result);
                    
                    // Format results
                    let debugInfo = `**🔍 URL Analysis: ${url}**\n`;
                    debugInfo += `**Method:** ${result.method}\n`;
                    debugInfo += `**Stock Status:** ${stockEmoji} ${stockText}\n`;
                    debugInfo += `**Price:** ${price || 'Not found'}\n\n`;
                    debugInfo += `**Buttons found (${result.buttons.length}):** ${result.buttons.length > 0 ? result.buttons.slice(0, 5).join(', ') + (result.buttons.length > 5 ? '...' : '') : 'None'}\n`;
                    debugInfo += `**Stock elements (${result.stockElements.length}):** ${result.stockElements.length > 0 ? result.stockElements.slice(0, 5).join(', ') + (result.stockElements.length > 5 ? '...' : '') : 'None'}\n`;
                    debugInfo += `**Price elements (${result.priceElements.length}):** ${result.priceElements.length > 0 ? result.priceElements.slice(0, 5).join(', ') + (result.priceElements.length > 5 ? '...' : '') : 'None'}\n`;
                    debugInfo += `**Page title:** ${result.title || 'None'}\n`;
                    
                    // Add recommendations if nothing found
                    if (!result.buttons.length && !result.stockElements.length && !result.priceElements.length) {
                        debugInfo += `\n⚠️ **No relevant data found. This could mean:**\n`;
                        debugInfo += `- Site heavily relies on JavaScript after page load\n`;
                        debugInfo += `- Site blocks automated access\n`;
                        debugInfo += `- Content is loaded via API calls\n`;
                        debugInfo += `- Unusual CSS class naming\n`;
                    }
                    
                    await loadingMsg.edit(debugInfo);
                    
                } catch (error) {
                    console.error('Scraping error:', error);
                    await loadingMsg.edit(`❌ **Error testing URL:** ${error.message}\n\n**Possible reasons:**\n- Site blocks automated requests\n- Network timeout\n- Invalid URL\n- Site requires authentication`);
                }
            }

            if (message.content === '!matcha-simulate-alert') {
                console.log('🎭 Simulating alert for testing');
                const testVendor = this.vendors['marukyu-koyamaen'];
                const testProduct = testVendor.products[0];
                const testStockInfo = { inStock: true, price: '¥2,520', url: 'https://www.marukyu-koyamaen.co.jp/english/shop/products/1181040c1' };
                
                await this.sendStockAlert('marukyu-koyamaen', testVendor, testProduct, testStockInfo);
                await message.reply('🎭 Test alert sent! Check the vendor channels.');
            }

            if (message.content === '!matcha-subs') {
                console.log('Triggered !matcha-subs command');
                const member = message.member;
                const guild = message.guild;
                const subscribed = [];

                for (const vendorKey in this.vendors) {
                    const vendor = this.vendors[vendorKey];
                    const role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
                    if (role && member.roles.cache.has(role.id)) {
                        subscribed.push(vendor.name);
                    }
                }

                if (subscribed.length === 0) {
                    await message.reply('You are not subscribed to any vendor alerts.');
                } else {
                    await message.reply(`You are subscribed to: ${subscribed.join(', ')}`);
                }
            }
            
            if (message.content === '!help') {
                const helpText = [
                    '**🍵 Matcha Bot Commands:**',
                    '`!help` — Show this help message',
                    '`!matcha-status` — Show monitoring status',
                    '`!matcha-test` — Test if the bot is working',
                    '`!matcha-check-now` — Manually check all vendor stocks',
                    '`!matcha-test-url <url>` — Test a specific product URL for stock info',
                    '`!matcha-simulate-alert` — Simulate a restock alert (for testing)',
                    '`!matcha-subs` — Show which vendors you are subscribed to'
                ].join('\n');
                await message.reply(helpText);
            }
        } catch (error) {
            console.error('Error handling message:', error);
            try {
                await message.reply('❌ An error occurred. Please check bot permissions.');
            } catch (replyError) {
                console.error('Could not send error reply:', replyError);
            }
        }
    }

    async setupChannels() {
        const guild = this.client.guilds.cache.first();
        if (!guild) {
            console.log('❌ No guild found');
            return;
        }

        console.log(`🏠 Setting up channels for guild: ${guild.name}`);

        // Find the "Matcha Vendors" category
        let matchaCategory = guild.channels.cache.find(
            ch => ch.name === '⛩️ — Matcha Vendors' && ch.type === ChannelType.GuildCategory
        );

        // If category doesn't exist, create it
        if (!matchaCategory) {
            console.log('📂 Creating "Matcha Vendors" category');
            try {
                matchaCategory = await guild.channels.create({
                    name: '⛩️ — Matcha Vendors',
                    type: ChannelType.GuildCategory,
                    reason: 'Category for matcha vendor monitoring channels'
                });
                console.log('✅ Created "Matcha Vendors" category');
            } catch (error) {
                console.error('❌ Error creating category:', error.message);
                return;
            }
        } else {
            console.log('📂 Found existing "Matcha Vendors" category');
        }

        const sortedVendorKeys = Object.keys(this.vendors).sort();
        let newRolesCreated = false;

        // Iterate through vendors
        for (const vendorKey of sortedVendorKeys) {
            const vendor = this.vendors[vendorKey];
            try {
                // Vendor channel format
                const channelName = `🪴│${vendorKey}`;

                // Check if the channel already exists
                let channel = guild.channels.cache.find(ch => ch.name === channelName);

                if (!channel) {
                    console.log(`📺 Creating channel: ${channelName}`);
                    channel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        parent: matchaCategory.id, // Put channel under the category
                        topic: `🍵 ${vendor.name} restock alerts`
                    });
                    console.log(`✅ Created channel: ${channelName} under Matcha Vendors category`);
                } else {
                    console.log(`📺 Channel already exists: ${channelName}`);
                    
                    // If channel exists but isn't in the category, move it
                    if (channel.parentId !== matchaCategory.id) {
                        console.log(`📁 Moving ${channelName} to Matcha Vendors category`);
                        await channel.setParent(matchaCategory.id, { lockPermissions: false });
                        console.log(`✅ Moved ${channelName} to category`);
                    }
                }

                // Create role for this vendor if it doesn't exist
                const roleName = `${vendor.name} Alerts`;
                let role = guild.roles.cache.find(r => r.name === roleName);
                if (!role) {
                    console.log(`🏷️ Creating role: ${roleName}`);
                    role = await guild.roles.create({
                        name: roleName,
                        color: 0x90EE90,
                        reason: 'Matcha restock alert role'
                    });
                    console.log(`✅ Created role: ${roleName}`);
                    newRolesCreated = true;
                } else {
                    console.log(`🏷️ Role already exists: ${roleName}`);
                }

            } catch (error) {
                if (error.code === 50013) {
                    console.log(`❌ Missing permissions for ${vendor.name}. Please give the bot Administrator role or Manage Channels + Manage Roles permissions.`);
                } else {
                    console.error(`❌ Error setting up ${vendor.name}:`, error.message);
                }
            }
        }
        // Create/find choose-vendors channel
        let chooseChannel = guild.channels.cache.find(ch => ch.name === '🛎️│choose-vendors');
        if (!chooseChannel) {
            chooseChannel = await guild.channels.create({
                name: '🛎️│choose-vendors',
                type: ChannelType.GuildText,
                topic: 'Select your matcha vendor alert roles here!'
            });
        }
        await this.sendRoleSelector(chooseChannel);

        console.log('✅ Channel and role setup completed');
    }

    async sendRoleSelector(channel) {
        // Find previous role selector message in the channel
        const messages = await channel.messages.fetch({ limit: 10 });
        const oldSelector = messages.find(msg =>
            msg.author.id === this.client.user.id &&
            msg.embeds.length &&
            msg.embeds[0].title === '🍵 Choose Your Matcha Vendor Alerts'
        );

        if (oldSelector) {
            // If selector already exists, do nothing
            return;
        }

        // Build new embed and buttons
        const embed = new EmbedBuilder()
            .setTitle('🍵 Choose Your Matcha Vendor Alerts')
            .setDescription('Select vendors below to get notified when their matcha is back in stock!')
            .setColor(0x90EE90)
            .addFields(
                { name: '📱 How it works', value: 'Select vendors to get pinged when their matcha comes back in stock' },
                { name: '🔔 Alert Format', value: 'Product name, price, stock status, and direct link' },
                { name: '⏰ Monitoring', value: 'We check every 5 minutes for restocks' }
            );

        const buttons = [];
        const vendors = Object.entries(this.vendors);
        for (let i = 0; i < vendors.length; i += 5) {
            const row = new ActionRowBuilder();
            for (let j = i; j < Math.min(i + 5, vendors.length); j++) {
                const [vendorKey, vendor] = vendors[j];
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`toggle_${vendorKey}`)
                        .setLabel(vendor.name)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🍵')
                );
            }
            buttons.push(row);
        }

        // Delete old selector if found
        if (oldSelector) {
            await oldSelector.delete();
        }

        // Send new selector only if not present
        await channel.send({ embeds: [embed], components: buttons });
    }

    async handleRoleToggle(interaction) {
        const vendorKey = interaction.customId.replace('toggle_', '');
        const vendor = this.vendors[vendorKey];
        const member = interaction.member;
        const guild = interaction.guild;

        if (!vendor) return;
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ ephemeral: true });
        }

        // Find or create role
        let role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
        if (!role) {
            role = await guild.roles.create({
                name: `${vendor.name} Alerts`,
                color: 0x90EE90,
                reason: 'Matcha restock alert role'
            });
        }

        const isSubscribed = member.roles.cache.has(role.id);
        const action = isSubscribed ? 'Unsubscribed' : 'Subscribed';

        if (isSubscribed) {
            await member.roles.remove(role);
        } else {
            await member.roles.add(role);

            // Only create channel when user subscribes
            const channelName = `🪴│${vendorKey}`;
            let channel = guild.channels.cache.find(ch => ch.name === channelName);
            if (!channel) {
                // Find or create category
                let matchaCategory = guild.channels.cache.find(
                    ch => ch.name.toLowerCase() === '⛩️ — Matcha Vendors' && ch.type === ChannelType.GuildCategory
                );
                if (!matchaCategory) {
                    matchaCategory = await guild.channels.create({
                        name: '⛩️ — Matcha Vendors',
                        type: ChannelType.GuildCategory,
                        reason: 'Category for matcha vendor monitoring channels'
                    });
                }
                channel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildText,
                    parent: matchaCategory.id,
                    topic: `🍵 ${vendor.name} restock alerts`
                });
            }
        }

        const message = isSubscribed
            ? `🔕 Unsubscribed from **${vendor.name}** alerts`
            : `🔔 Subscribed to **${vendor.name}** alerts!`;

        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: message, ephemeral: true });
        } else {
            await interaction.followUp({ content: message, ephemeral: true });
        }
    }

    async checkStock(supplier, product) {
        try {
            const result = await scrapeWebsite(supplier.url);

            // Use the same helpers as !matcha-test-url
            const inStock = isInStock(result);
            const price = extractPrice(result);


            return { inStock, price: price || 'Not found', supplier: supplier.name, url: supplier.url };
        } catch (error) {
            console.error(`Error checking ${supplier.name} - ${product.name}:`, error.message);
            return { inStock: false, price: 'Error', supplier: supplier.name,url: supplier.url };
        }
    }


    async sendStockAlert(vendorKey, vendor, product, stockInfo) {
        const guild = this.client.guilds.cache.first();
        if (!guild) return;

        const channel = guild.channels.cache.find(ch => ch.name === `🪴│${vendorKey}`);
        const role = guild.roles.cache.find(r => r.name === `${vendor.name} Alerts`);
        
        if (!channel || !role) return;

        const embed = new EmbedBuilder()
            .setTitle(`${product.name} is back in stock!`)
            .setDescription(`🔔 <@&${role.id}> via ${stockInfo.supplier}`)
            .setColor(0x00ff00)
            .addFields(
                { name: '**Product**', value: product.name, inline: true },
                { name: '**Supplier**', value: stockInfo.supplier, inline: true },
                { name: '💰 Price', value: stockInfo.price || 'Not found', inline: true },
                { name: '📦 Status', value: '🟢 Available', inline: true },
                { name: '🔗 Link', value: `[View Product](${stockInfo.url})`, inline: true }
            )
            .setFooter({ 
                text: `Matcha Bell | ${new Date().toLocaleString('en-US', { 
                    timeZone: 'America/New_York',
                    year: 'numeric',
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })} (EST)`
            })
            // .setThumbnail('https://cdn.discordapp.com/emojis/1234567890123456789.png'); // Add matcha image

        await channel.send({ content: `${role} - New restock alert!`, embeds: [embed] });
    }

    async checkStockWithRetry(vendor, product, maxRetries = 5) {
        let attempt = 0;
        let delay = 2000; // Start with 2 seconds
        while (attempt < maxRetries) {
            try {
                return await this.checkStock(vendor, product);
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    console.warn(`Rate limited! Retrying in ${delay / 1000}s...`);
                    await new Promise(res => setTimeout(res, delay));
                    delay *= 2; // Exponential backoff
                    attempt++;
                } else {
                    throw error;
                }
            }
        }
        throw new Error('Max retries reached for ' + product.name);
    }

    startMonitoring() {
        if (this._monitoringStarted) return;
        this._monitoringStarted = true;

        cron.schedule('*/5 * * * *', async () => { // Check every 5 minutes
            console.log('🔍 Checking for restocks...');
            for (const [vendorKey, vendor] of Object.entries(this.vendors)) {
                for (const product of vendor.products) {
                    for (const supplier of product.suppliers) {
                        const productKey = `${vendorKey}_${product.name}_${supplier.name}`;
                        try {
                            const stockInfo = await this.checkStock(supplier, product);
                            const previousStock = this.stockData.get(productKey);

                        if (stockInfo.inStock && (previousStock === false || previousStock === undefined)) {
                            console.log(`🎉 ${vendor.name} - ${product.name} is back in stock!`);
                            await this.sendStockAlert(vendorKey, vendor, product, { ...stockInfo, supplier: supplier.name });
                        }

                        this.stockData.set(productKey, stockInfo.inStock);
                    } catch (err) {
                        console.error(`Error checking ${vendor.name} - ${product.name}:`, err.message);
                    }
                        await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between products
                    }
                    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between vendors
                }
            }
            await this.saveStockData();
        });
        console.log('📊 Stock monitoring started - checking every 5 minutes');
    }

    async sendStatusUpdate(channel) {
        const embed = new EmbedBuilder()
            .setTitle('📊 Matcha Monitoring Status')
            .setColor(0x90EE90)
            .setDescription(`Monitoring ${Object.keys(this.vendors).length} vendors with ${Object.values(this.vendors).reduce((acc, v) => acc + v.products.length, 0)} products`)
            .addFields(
                { name: '⏰ Check Frequency', value: 'Every 5 minutes', inline: true },
                { name: '📱 Last Check', value: new Date().toLocaleTimeString(), inline: true },
                { name: '💾 Products Tracked', value: this.stockData.size.toString(), inline: true }
            );

        await channel.send({ embeds: [embed] });
    }

    healthCheck() {
        // Health check to monitor bot status
        console.log('🤖 Starting health check...');
        setInterval(() => {
            console.log(`🤖 Bot health check: ${new Date().toISOString()}`);
            console.log(`📊 Monitoring ${this.stockData.size} products`);
        }, 300000); // Every 5 minutes
    }
}

// Usage
const bot = new MatchaBot(process.env.DISCORD_TOKEN);

module.exports = MatchaBot;