-- Add FK for products join from order_items
alter table if exists order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id)
  references products(id)
  on delete set null;
