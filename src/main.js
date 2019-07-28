

    var config = {
        type: Phaser.AUTO,
        width: 4000,
        height: 2000,
        pixelArt: true,
        roundPixels: true, 
        scene: {
            preload: preload,
            create: create,
            update: update
        },
        physics: {
            default: 'matter',
            matter: {
                gravity: { y: 1 },
                enableSleep: true
            }
        }, scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
        plugins: {
            scene: [
                {
                    plugin: PhaserMatterCollisionPlugin, // The plugin class
                    key: "matterCollision", // Where to store in Scene.Systems, e.g. scene.sys.matterCollision
                    mapping: "matterCollision" // Where to store in the Scene, e.g. scene.matterCollision
                }
            ]
        }
    };

    var game = new Phaser.Game(config);

    function preload ()
    {
        this.load.image("tiles", "../res/tileset.png");
        this.load.tilemapTiledJSON("map", "../res/map.json");
        this.load.spritesheet('cat',
            '../res/cat.png',
            { frameWidth: 400, frameHeight: 200 }
        );

    } 
    function create ()
    {
        
        const map = this.make.tilemap({ key: "map" }) 

        const tileset = map.addTilesetImage("tileset", "tiles");


        const sky    = map.createStaticLayer("sky", tileset, 0, 0);
        const ground = map.createDynamicLayer("ground", tileset, 0, 0);
        const background = map.createStaticLayer("background", tileset, 0, 0);
        const house = map.createStaticLayer("house", tileset, 0, 0);
        const pillar = map.createStaticLayer("pillar", tileset, 0, 0);
        const box = map.createDynamicLayer("box", tileset, 0, 0);
        const tree = map.createStaticLayer("tree", tileset, 0, 0);

		ground.setCollisionByProperty({ collides: true }); 
		box.setCollisionByProperty({ collides: true }); 
		tree.setCollisionByProperty({ collides: true }); 

        this.matter.world.convertTilemapLayer(ground);
        this.matter.world.convertTilemapLayer(box);
        this.matter.world.convertTilemapLayer(tree);

        this.matter.world.createDebugGraphic();

        cat = new Cat(this, 2900, 400, 'cat');


        // this.anims.create({
        //     key: 'def',
        //     frames: [ { key: 'cat', frame: 1 } ], //this.anims.generateFrameNumbers('cat', { start: 0, end: 3 }),
        //     frameRate: 10,
        //     //repeat: -1
        // });
        // this.anims.create({
        //     key: 'turn',
        //     frames: [ { key: 'cat', frame: 3 } ],
        //     frameRate: 10
        // });
        //
        // this.anims.create({
        //     key: 'right',
        //     frames: [ { key: 'cat', frame: 2 } ],//this.anims.generateFrameNumbers('cat', { start: 5, end: 8 }),
        //     frameRate: 10,
        //     //repeat: -1
        // });
        const camera = this.cameras.main;
        camera.startFollow(cat.sprite, false, 0.05, 0.5, -160, 250);
        camera.setDeadzone(400, 800);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        // cursors = this.input.keyboard.createCursorKeys();
        this.matter.world.drawDebug = true;
        // const debugKey = this.input.keyboard.addKey('g');  // Get key object
        // debugKey.on('down', function(event) {
            // this.matter.world.drawDebug = !this.matter.world.drawDebug;
        // });





    }
    function update ()
    {
    }
