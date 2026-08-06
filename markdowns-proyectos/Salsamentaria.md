# Taller Calidad de Software - Sistema de Gestión para Salsamentaría

## Descripción del Proyecto

Sistema web integral para la gestión administrativa y comercial de una salsamentaría, desarrollado como proyecto académico en el marco de la competencia de Calidad de Software. El objetivo principal de este desarrollo es evaluar y aplicar herramientas de Code Review tales como SonarQube y Codacy, con el fin de garantizar la calidad del código mediante el análisis estático y la identificación de mejoras.

El sistema implementa funcionalidades completas de autenticación de usuarios, gestión de inventario, procesamiento de ventas y un panel de administración con visualización de métricas empresariales mediante gráficos interactivos.

---

## Características Principales

### Sistema de Autenticación y Autorización

- Registro de usuarios con validación de datos
- Inicio de sesión seguro mediante JSON Web Tokens (JWT)
- Sistema de roles diferenciados: ADMINISTRADOR y CLIENTE
- Protección de rutas y endpoints basada en roles
- Encriptación de contraseñas mediante BCrypt

### Módulo de Cliente

- Visualización del catálogo completo de productos
- Sistema de carrito de compras con gestión de cantidades
- Proceso de checkout con validación de disponibilidad de stock
- Historial detallado de compras realizadas
- Filtrado de productos por categoría y búsqueda por nombre

### Panel de Administración

#### Dashboard Interactivo
- Resumen estadístico de ventas (total, pendientes, completadas, canceladas)
- Indicadores de productos activos y alertas de stock bajo
- Gráfico de ventas de los últimos 7 días
- Visualización de productos más vendidos mediante gráfico de barras
- Listado de productos con stock crítico

#### Gestión de Productos
- CRUD completo (Crear, Leer, Actualizar, Eliminar)
- Control de stock en tiempo real
- Activación y desactivación de productos
- Búsqueda avanzada y filtros por categoría
- Gestión de imágenes mediante URL

#### Gestión de Ventas
- Visualización de todas las transacciones del sistema
- Sistema de estados: PENDIENTE, COMPLETADA, CANCELADA
- Cambio de estado de ventas con restauración automática de inventario
- Vista detallada de cada transacción con productos asociados
- Filtrado por estado y búsqueda por cliente

#### Gestión de Categorías
- CRUD completo para organización de productos
- Interfaz visual mediante sistema de tarjetas
- Validación de eliminación con productos asociados

### Gestión de Inventario

- Validación automática de stock disponible antes de procesar ventas
- Descuento automático de inventario al confirmar transacciones
- Restauración de stock al cancelar o eliminar ventas en estado PENDIENTE
- Sistema de alertas para productos con stock crítico

---

## Stack Tecnológico

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Java | 21 | Lenguaje de programación principal |
| Spring Boot | 3.5.6 | Framework de aplicación |
| Spring Security | 6.x | Seguridad y autenticación |
| Spring Data JPA | 3.x | Capa de persistencia |
| JWT (jjwt) | 0.11.5 | Generación y validación de tokens |
| Lombok | Latest | Reducción de código repetitivo |
| MySQL Connector | 8.x | Conexión a base de datos |
| Maven | 3.6+ | Gestión de dependencias |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Angular | 20+ | Framework SPA |
| TypeScript | 5.x | Lenguaje de programación tipado |
| Bootstrap | 5.x | Framework CSS |
| Bootstrap Icons | Latest | Biblioteca de iconos |
| Chart.js | 4.5.0 | Visualización de datos |
| RxJS | 7.x | Programación reactiva |

### Base de Datos

- **MySQL 8.0+**: Sistema de gestión de base de datos relacional

---

## Requisitos del Sistema

Antes de proceder con la instalación, asegúrese de contar con los siguientes componentes:

- **Java Development Kit (JDK) 21** o superior
- **Node.js 18+** y npm (Node Package Manager)
- **MySQL Server 8.0+**
- **Maven 3.6+** (incluido en Spring Boot)
- **Angular CLI** (instalable vía npm)
- **Git** para control de versiones

### IDEs Recomendados

- IntelliJ IDEA (Backend)
- Visual Studio Code con extensiones para Angular (Frontend)
- MySQL Workbench (Gestión de base de datos)

---

## Instalación y Configuración

### 1. Clonación del Repositorio

```bash
git clone https://github.com/1Zamuken1/taller_calidad_software_Salsamentaria.git
cd taller_calidad_software_Salsamentaria
```

### 2. Configuración de la Base de Datos

#### Opción A: Importación mediante línea de comandos

```bash
# Iniciar sesión en MySQL
mysql -u root -p

# Importar el script SQL
mysql -u root -p < database/salsamentaria.sql
```

#### Opción B: Creación manual

```sql
CREATE DATABASE salsamentaria CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE salsamentaria;

-- Ejecutar el contenido del archivo database/salsamentaria.sql
```

El script proporcionado incluye:
- Definición completa del esquema de base de datos
- Datos de muestra para pruebas
- Usuario administrador predeterminado

### 3. Configuración del Backend

#### 3.1. Navegación al directorio del backend

```bash
cd backend
```

#### 3.2. Configuración de propiedades de aplicación

Edite el archivo `src/main/resources/application.properties`:

```properties
# Configuración de Base de Datos
spring.datasource.url=jdbc:mysql://localhost:3306/salsamentaria?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=

# Configuración de JPA/Hibernate
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect

# Configuración del servidor
server.port=8080

# Configuración de JWT
jwt.secret=CLAVE_SECRETA_JWT_MINIMO_256_BITS_CAMBIAR_EN_PRODUCCION
jwt.expiration=86400000

# Configuración de CORS
cors.allowed-origins=http://localhost:4200
```


#### 3.3. Compilación y ejecución

```bash
# Instalación de dependencias
mvn clean install

# Ejecución del servidor
mvn spring-boot:run
```

El servidor estará disponible en: `http://localhost:8080`

### 4. Configuración del Frontend

#### 4.1. Navegación al directorio del frontend

```bash
cd ../salsamentaria-frontend
```

#### 4.2. Instalación de dependencias

```bash
# Instalación de paquetes npm
npm install

# Instalación global de Angular CLI (si es necesario)
npm install -g @angular/cli
```

#### 4.3. Ejecución del servidor de desarrollo

```bash
ng serve
```

La aplicación estará disponible en: `http://localhost:4200`


---

## Documentación de API REST

### Endpoints de Autenticación

#### Registro de Usuario
```
POST /auth/register
Content-Type: application/json

Request Body:
{
  "nombre": "string",
  "email": "string",
  "password": "string"
}

Response: 200 OK
{
  "token": "jwt_token",
  "id": integer,
  "nombre": "string",
  "email": "string",
  "rol": "CLIENTE"
}
```

#### Inicio de Sesión
```
POST /auth/login
Content-Type: application/json

Request Body:
{
  "email": "string",
  "password": "string"
}

Response: 200 OK
{
  "token": "jwt_token",
  "id": integer,
  "nombre": "string",
  "email": "string",
  "rol": "string"
}
```

### Endpoints de Productos

#### Listar Productos
```
GET /api/productos
Authorization: Bearer {token}

Response: 200 OK
[
  {
    "id_producto": integer,
    "nombre": "string",
    "descripcion": "string",
    "precio": double,
    "stock": integer,
    "imagen_url": "string",
    "estado": boolean,
    "categoria": {
      "id_categoria": integer,
      "nombre": "string"
    }
  }
]
```

#### Crear Producto (ADMIN)
```
POST /api/crear
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "nombre": "string",
  "descripcion": "string",
  "precio": double,
  "stock": integer,
  "imagen_url": "string",
  "estado": boolean,
  "id_categoria": integer
}

Response: 200 OK
"Producto Creado Correctamente"
```

#### Actualizar Producto (ADMIN)
```
PUT /api/editar/{id}
Authorization: Bearer {token}
Content-Type: application/json

Request Body: (campos opcionales)
{
  "nombre": "string",
  "precio": double,
  "stock": integer,
  "id_categoria": integer,
  ...
}

Response: 200 OK
"Producto actualizado correctamente"
```

#### Eliminar Producto (ADMIN)
```
DELETE /api/eliminar/{id}
Authorization: Bearer {token}

Response: 200 OK
"Producto Eliminado Correctamente"
```

### Endpoints de Ventas

#### Crear Venta
```
POST /api/ventas/crear
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "id_usuario": integer,
  "detalles": [
    {
      "id_producto": integer,
      "cantidad": integer
    }
  ]
}

Response: 200 OK
{
  "mensaje": "Venta registrada correctamente",
  "total": double,
  "id_venta": integer
}
```

#### Obtener Historial de Compras
```
GET /api/ventas/mis-compras
Authorization: Bearer {token}

Response: 200 OK
[...]
```

#### Listar Todas las Ventas (ADMIN)
```
GET /api/ventas/
Authorization: Bearer {token}

Response: 200 OK
[...]
```

#### Actualizar Estado de Venta (ADMIN)
```
PUT /api/ventas/{id}/estado?estado={COMPLETADA|CANCELADA|PENDIENTE}
Authorization: Bearer {token}

Response: 200 OK
{
  "mensaje": "Estado actualizado",
  "nuevo_estado": "string",
  "stock_restaurado": boolean
}
```

### Endpoints de Categorías

#### Listar Categorías
```
GET /api/categorias
Authorization: Bearer {token}

Response: 200 OK
[...]
```

#### Crear Categoría (ADMIN)
```
POST /api/categorias/crear
Authorization: Bearer {token}
Content-Type: application/json

Request Body:
{
  "nombre": "string",
  "descripcion": "string"
}

Response: 200 OK
"Categoría creada correctamente"
```

---

## Credenciales de Acceso

### Usuario Administrador
- **Email**: admin@gmail.com
- **Contraseña**: 123456789
- **Rol**: ADMIN
- **Permisos**: Acceso completo al panel de administración

### Usuario Cliente (Pruebas)
- **Email**: juanito@gmail.com
- **Contraseña**: 123456789
- **Rol**: CLIENTE
- **Permisos**: Acceso a catálogo y carrito de compras

---

## Estructura de Directorios

### Backend (Spring Boot)

```
src/main/java/Salsamentaria/salsamentaria/
│
├── auth/                           # Módulo de autenticación
│   ├── AuthController.java
│   ├── AuthService.java
│   ├── AuthResponse.java
│   ├── LoginRequest.java
│   └── RegisterRequest.java
│
├── config/                         # Configuración de aplicación
│   ├── ApplicationConfig.java
│   └── SecurityConfig.java
│
├── controllers/                    # Controladores REST
│   ├── CategoriaController.java
│   ├── ProductoController.java
│   └── VentaController.java
│
├── JWT/                           # Gestión de JWT
│   ├── JwtAuthenticationFilter.java
│   └── JwtService.java
│
├── models/                        # Entidades de dominio
│   ├── Categoria.java
│   ├── DetalleVenta.java
│   ├── Producto.java
│   ├── Venta.java
│   └── VentaRequest.java
│
├── repository/                    # Capa de persistencia
│   ├── CategoriaRepository.java
│   ├── DetalleVentaRepository.java
│   ├── ProductoRepository.java
│   └── VentaRepository.java
│
└── User/                          # Gestión de usuarios
    ├── User.java
    ├── UserRepository.java
    └── Rol.java
```

### Frontend (Angular)

```
src/app/
│
├── components/                    # Componentes de la aplicación
│   ├── login/
│   ├── register/
│   ├── productos/
│   ├── carrito/
│   ├── historial-compras/
│   ├── admin-layout/
│   ├── admin-dashboard/
│   ├── admin-productos/
│   ├── admin-ventas/
│   └── admin-categorias/
│
├── guards/                        # Protección de rutas
│   ├── auth.guard.ts
│   └── admin.guard.ts
│
├── services/                      # Servicios de negocio
│   ├── auth.service.ts
│   ├── productos.service.ts
│   ├── carrito.service.ts
│   └── ventas.service.ts
│
└── app.routes.ts                  # Configuración de rutas
```

---

## Glosario de Términos

- **JWT**: JSON Web Token, estándar para autenticación basada en tokens
- **CRUD**: Create, Read, Update, Delete - operaciones básicas de persistencia
- **ORM**: Object-Relational Mapping - mapeo objeto-relacional
- **SPA**: Single Page Application - aplicación de página única
- **REST**: Representational State Transfer - estilo arquitectónico para APIs
- **DTO**: Data Transfer Object - objeto para transferencia de datos
- **BCrypt**: Función de hash criptográfico para contraseñas
- **CORS**: Cross-Origin Resource Sharing - compartición de recursos entre orígenes

---

## Referencias y Documentación Adicional

### Documentación Oficial

- [Spring Boot Documentation](https://docs.spring.io/spring-boot/docs/current/reference/htmlsingle/)
- [Angular Documentation](https://angular.io/docs)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [JWT.io](https://jwt.io/introduction)

### Tutoriales y Guías

- [Spring Security con JWT](https://www.baeldung.com/spring-security-oauth-jwt)
- [Angular Best Practices](https://angular.io/guide/styleguide)
- [REST API Design](https://restfulapi.net/)

### Herramientas de Análisis de Código

- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Codacy Documentation](https://docs.codacy.com/)

---

## Información del Autor

**Nombre**: Juan Esteban Barrios   P
**Proyecto**: Taller de Calidad de Software  
**Institución**: SENA - Centro de Servicios Financieros  
**Año**: 2025  
**Contacto**: juanbarrios072@gmail.com

---

## Licencia

Este proyecto ha sido desarrollado con fines **académicos** en el contexto de la asignatura de Calidad de Software. No se encuentra bajo ninguna licencia de código abierto específica. El uso, modificación o distribución del código debe ser consultado con el autor.

---

**Última actualización**: Octubre 2025  
**Versión del documento**: 1.0.0  
**Estado del proyecto**: En desarrollo activo