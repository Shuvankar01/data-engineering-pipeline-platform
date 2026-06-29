/**
 * Public, demo-safe sample dataset used to seed first-time users.
 * Kept inline (no Storage bucket dependency) so the seed function
 * works in a single round-trip.
 */

export const SAMPLE_ORDERS_CSV = `order_id,customer_email,country,product,quantity,unit_price,order_date,status
1001,alice@example.com,US,Notebook,2,12.50,2024-01-04,paid
1002,BOB@example.com,US,Pen,10,1.20,2024-01-05,paid
1003,carla@example.com,UK,Notebook,1,12.50,2024-01-05,refunded
1004,dan@example.com,US,Backpack,1,49.99,2024-01-06,paid
1005,eve@example.com,IN,Notebook,3,12.50,2024-01-07,paid
1006,frank@example.com,US,Pen,5,1.20,2024-01-08,paid
1007,GINA@example.com,UK,Backpack,2,49.99,2024-01-09,paid
1008,henry@example.com,US,Notebook,1,12.50,2024-01-09,paid
1008,henry@example.com,US,Notebook,1,12.50,2024-01-09,paid
1009,,US,Pen,4,1.20,2024-01-10,paid
1010,ivy@example.com,US,Backpack,1,,2024-01-11,paid
1011,jay@example.com,UK,Notebook,2,12.50,2024-01-12,paid
1012,kate@example.com,US,Pen,8,1.20,2024-01-13,paid
1013,leo@example.com,US,Backpack,1,49.99,2024-01-14,paid
1014,mia@example.com,IN,Notebook,4,12.50,2024-01-15,paid
1015,nora@example.com,US,Pen,12,1.20,2024-01-16,paid
1016,owen@example.com,UK,Backpack,1,49.99,2024-01-17,paid
1017,pia@example.com,US,Notebook,2,12.50,2024-01-18,paid
1018,quinn@example.com,US,Pen,6,1.20,2024-01-19,paid
1019,ron@example.com,US,Backpack,3,49.99,2024-01-20,paid
1020,sara@example.com,IN,Notebook,1,12.50,2024-01-21,paid`;
