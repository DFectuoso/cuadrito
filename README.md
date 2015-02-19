# Cuadrito.co

Cuadrito.co es un software open source para poder imprimir fotos de instagram que utiliza a Conekta como metodo de Pago.

### Requerimientos

Necesitas tener instalado:

* Node
* npm
* git
* Mongo
* Redis
* Cairo y Node-Canvas

### Instalar Node

Para instalar Node, utilizar, revisar [el sitio oficial de Node](http://nodejs.org/download/)

### Instalar Mongo

Para instalar mongo, puedes usar port:

```
port install mongodb
```

O puedes usar brew:

```
brew update
brew install mongodb
```

### Instalar Redis

Para instalar redis, puedes usar port:

```
port install mongodb
```

O puedes usar brew:

```
brew install redis
```

### Instalar Cairo

Para instalar cairo, puedes usar brew, en macosx parece que ports no funciona, por eso:

Tener instalado libjpeg:

```
brew install libjpeg
```

```
brew install cairo
```

Quiza tengas que instalar X11 como parte del proceso, te lo indicara en la consola.

### Instalar node-canvas y todos los demas paquetes de npm

En la carpeta del proyecto:

```
npm install
```


### Configurar dev

Copiar el archivo dev.json.example a /config/dev.json
Rellenar las claves de conekta, Instagram, sendgrid, etc.

### Correr la aplicación

Tener corriendo mongo y redis. En una terminal correr:

```
mongod
```

En otra terminal correr redis:

```
redis-server /usr/local/etc/redis.conf
```

Por ultimo, en la carpeta del proyecto, correr:
```
node app.js
```

### Correr con supervisor

Si deseas usar supervisor, puedes instalarlo con:

```
npm install -g node-inspector supervisor forever
```

### Correr en produccion:

Exportar la bandera de producción, con esto se cargara prod.json, en lugar de dev.json:

```
export NODE_ENV="production"
```

Correr la aplicación con sus respectivos logs:

```
forever start -a --sourceDir /root/cuadrito -o ../logs/cuadrito.log -e ../logs/cuadrito.error.log -l ../logs/forever.log app.js
```

### RoadMap


* Mejorar imagen y experiencia del checkout
* Arreglar el proceso de seleccionar imagenes de instagram
