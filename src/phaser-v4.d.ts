// Phaser 4 types Graphics#fillPoints/strokePoints as Vector2[], while the implementation only reads x and y
// (node_modules/phaser/src/gameobjects/graphics/Graphics.js). Phaser 3 accepted any[]: the games pass plain
// {x, y} literals, so the parameter is widened back to Vector2Like instead of allocating Vector2 everywhere.
declare namespace Phaser.GameObjects {
    interface Graphics {
        fillPoints(points: readonly Phaser.Types.Math.Vector2Like[], closeShape?: boolean, closePath?: boolean, endIndex?: number): this;
        strokePoints(points: readonly Phaser.Types.Math.Vector2Like[], closeShape?: boolean, closePath?: boolean, endIndex?: number): this;
    }
}
