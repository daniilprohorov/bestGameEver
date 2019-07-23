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
            default: 'arcade',
            arcade: {
                gravity: { y: 1000 },
                debug: false  
            }
        }, scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
        },
    };

    var game = new Phaser.Game(config);

    function preload ()
    {
        this.load.image("tiles", "../res/tileset.png");
        this.load.tilemapTiledJSON("map", "../res/map.json");
        this.load.spritesheet('cat',
            '../res/cat.png',
            { frameWidth: 200, frameHeight: 200 }
        );
    } 
    function create ()
    {
        const map = this.make.tilemap({ key: "map" }) 

        const tileset = map.addTilesetImage("tileset", "tiles");


        const sky    = map.createStaticLayer("sky", tileset, 0, 0);
        const ground = map.createStaticLayer("ground", tileset, 0, 0);
        const background = map.createStaticLayer("background", tileset, 0, 0);
        const house = map.createStaticLayer("house", tileset, 0, 0);
        const box = map.createStaticLayer("box", tileset, 0, 0);
        const tree = map.createStaticLayer("tree", tileset, 0, 0);
		ground.setCollisionByProperty({ collides: true }); 
		box.setCollisionByProperty({ collides: true }); 
		tree.setCollisionByProperty({ collides: true }); 

        cat = this.physics.add.sprite(2900, 1000, 'cat');
        // cat.setBounce(0.2);

        // cat.setCollideWorldBounds(true);
        this.physics.world.TILE_BIAS = 40;
        this.physics.add.collider(cat, ground);
        this.physics.add.collider(cat, box);
        this.physics.add.collider(cat, tree);
        
        this.anims.create({
            key: 'left',
            frames: [ { key: 'cat', frame: 0 } ], //this.anims.generateFrameNumbers('cat', { start: 0, end: 3 }),
            frameRate: 10,
            //repeat: -1
        });

        this.anims.create({
            key: 'def',
            frames: [ { key: 'cat', frame: 1 } ], //this.anims.generateFrameNumbers('cat', { start: 0, end: 3 }),
            frameRate: 10,
            //repeat: -1
        });
        this.anims.create({
            key: 'turn',
            frames: [ { key: 'cat', frame: 3 } ],
            frameRate: 10
        });

        this.anims.create({
            key: 'right',
            frames: [ { key: 'cat', frame: 2 } ],//this.anims.generateFrameNumbers('cat', { start: 5, end: 8 }),
            frameRate: 10,
            //repeat: -1
        });


        const camera = this.cameras.main;
        camera.startFollow(cat, false, 0.05, 0.5, -160, 250);
        camera.setDeadzone(400, 800);
        camera.centerOn(2000, 1000);
        camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        camera.roundPixels= true;

        cursors = this.input.keyboard.createCursorKeys();

    }
    function update ()
    {

        // for going left and right 
        if (cursors.left.isDown) {
            cat.setVelocityX(-250);
            cat.anims.play('left', true);
        }
        else if (cursors.right.isDown) {
            cat.setVelocityX(250);
            cat.anims.play('right', true);
        }
        else {
            cat.setVelocityX(0);
            cat.anims.play('def', true);
        }
        
        // for jumping
        if (cursors.up.isDown && cat.body.onFloor()){
            cat.setVelocityY(-1000);
            cat.anims.play('turn', true);
        }
        // for jumping from walls
        else if(cat.body.onWall() && cursors.up.isDown) {
            if(cursors.left.isDown) {
                cat.setVelocity(-150, -700);
            }
            else if (cursors.right.isDown) {
                cat.setVelocity(150, -700);
            }

        }

        
        
    }
