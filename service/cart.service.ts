import pool from "../db/db.js"


export const getCart = async( userId: number) => {
 

    const findCart = await pool.query(
        `SELECT * FROM carts
        WHERE user_id = $1`, [userId]
)

    const findedCart = findCart.rows[0];
    
    let cart;

    if(!findedCart) {
        const createCart = await pool.query(
            `INSERT INTO carts(user_id)
            VALUES ($1)
            RETURNING *`, 
            [userId]
        )
    cart = createCart.rows[0];
}       else {
    cart = findedCart;
}
    const items = await pool.query(
        `SELECT 
        ci.id,
        ci.quantity,
        ci.cart_id, 
        p.name,
        p.description,
        p.price
         FROM cart_items ci
         JOIN products p 
         ON ci.product_id = p.id
         WHERE ci.id = $1`,
         [cart.cart_id]
    );
    
     return {
        cart,
        items: items.rows
    };

}
