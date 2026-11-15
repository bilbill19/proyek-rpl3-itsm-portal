# ERD ITSM Portal (11 Entitas)

Hasil audit `prisma/schema.prisma`. Tipe dan atribut mengikuti tipe Prisma; `UK` menandai unique tunggal. Unique komposit dijelaskan sesudah diagram.

```mermaid
erDiagram
    USER {
        String id PK "UUID default"
        String name
        String email UK
        String password
        String phone "nullable"
        Role role "default CUSTOMER"
        Boolean isActive "default true"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    SERVICE {
        String id PK "UUID default"
        String name
        String description "Text"
        Decimal price "12,2"
        String estimatedDuration
        String image "nullable"
        Boolean isActive "default true"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    SERVICE_ORDER {
        String id PK "UUID default"
        String ticketNumber UK
        String customerId FK
        String serviceId FK "nullable"
        String deviceType
        String deviceBrand
        String problemDescription "Text"
        String damageImage "nullable; Text"
        String serviceMethod "default DROP_OFF"
        String address "nullable; Text"
        Decimal estimatedPrice "nullable; 12,2"
        Decimal finalPrice "nullable; 12,2"
        OrderStatus status "default CREATED"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    SERVICE_ORDER_STATUS_HISTORY {
        String id PK "UUID default"
        String orderId FK
        OrderStatus status
        String note "nullable; Text"
        DateTime createdAt "default now"
    }
    AI_CONVERSATION {
        String id PK "UUID default"
        String customerId FK
        String title "default Konsultasi Perbaikan IT"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    AI_MESSAGE {
        String id PK "UUID default"
        String conversationId FK
        MessageRole role "default USER"
        String content "Text"
        DateTime createdAt "default now"
    }
    INVENTORY_ITEM {
        String id PK "UUID default"
        String sku UK
        String name
        String category
        String brand "nullable"
        String compatibility "nullable"
        Int stock "default 0"
        Int minStock "default 5"
        String unit "default Unit"
        Decimal purchasePrice "12,2"
        Decimal sellingPrice "12,2"
        String location "nullable"
        String condition "default NEW"
        String notes "nullable; Text"
        Boolean isActive "default true"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    NOTIFICATION {
        String id PK "UUID default"
        String userId FK
        String orderId FK "nullable"
        String type "default order_status"
        String title
        String body "Text"
        String dedupKey "nullable"
        Boolean isRead "default false"
        DateTime createdAt "default now"
    }
    NOTIFICATION_PREFERENCE {
        String id PK "UUID default"
        String userId FK
        String channel
        Boolean enabled "default false"
        DateTime updatedAt "updatedAt"
    }
    WHATSAPP_DELIVERY {
        String id PK "UUID default"
        String orderId FK "nullable"
        String userId FK
        String toPhone
        String templateName "default itsm_order_status_update"
        String mode
        String status
        String providerMessageId "nullable"
        String error "nullable; Text"
        Int attempts "default 0"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    NOTIFICATION_OUTBOX {
        String id PK "UUID default"
        String eventType
        String payload "Text"
        String status "default pending"
        Int attempts "default 0"
        DateTime nextAttemptAt "default now"
        String lastError "nullable; Text"
        DateTime createdAt "default now"
        DateTime updatedAt "updatedAt"
    }
    USER ||--o{ SERVICE_ORDER : "customerId; onDelete CASCADE"
    SERVICE o|--o{ SERVICE_ORDER : "serviceId; onDelete SET NULL"
    SERVICE_ORDER ||--o{ SERVICE_ORDER_STATUS_HISTORY : "orderId; onDelete CASCADE"
    USER ||--o{ AI_CONVERSATION : "customerId; onDelete CASCADE"
    AI_CONVERSATION ||--o{ AI_MESSAGE : "conversationId; onDelete CASCADE"
    USER ||--o{ NOTIFICATION : "userId; onDelete CASCADE"
    SERVICE_ORDER o|--o{ NOTIFICATION : "orderId; onDelete SET NULL"
    USER ||--o{ NOTIFICATION_PREFERENCE : "userId; onDelete CASCADE"
    USER ||--o{ WHATSAPP_DELIVERY : "userId; onDelete CASCADE"
    SERVICE_ORDER o|--o{ WHATSAPP_DELIVERY : "orderId; onDelete SET NULL"
```

## Batasan dan unique komposit

- `Notification` memiliki `@@unique([orderId, dedupKey])`; uniqueness berlaku pada pasangan, bukan pada setiap kolom sendiri.
- `NotificationPreference` memiliki `@@unique([userId, channel])`.
- `email`, `ticketNumber`, dan `sku` unik masing-masing.
- `serviceId`, `Notification.orderId`, dan `WhatsAppDelivery.orderId` nullable. Relasi opsional memakai `SET NULL`; relasi lainnya memakai `CASCADE` seperti ditampilkan.
- `NotificationOutbox` tidak memiliki FK. `InventoryItem` tidak memiliki relasi. `AIConversation.customerId` adalah FK wajib ke `User.id`.
