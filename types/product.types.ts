




export type CreateProductData = {
    name: string;
    description: string;
    price: number;
    stock: number;
    category_id: number;
};

export type UpdateProductData = Partial<CreateProductData>;