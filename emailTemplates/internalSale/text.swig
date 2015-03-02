Nueva venta!
Hay que correr a imprimir!

Confirmacion de compra:
Order: {{order.id}}
Precio: {{printablePrice}}
Direccion: {{order.address}}
Nombre: {{order.user.username}}
Correo: {{order.email}}
Telefono: {{order.phone}}

Printables:
{% for printable in order.printables %}
- {{printable}}
{% endfor %}

En breve estaremos contactandote para afinar los detalles de tu envio!

- Santiago
