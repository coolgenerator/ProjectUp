package helper

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"projectup/models"
	"projectup/utils"

	"github.com/streadway/amqp"
)

// PublishPrivateMessage publishes a private message to RabbitMQ
func PublishPrivateMessage(msg models.PrivateMessage) error {
	rabbitMQURL := os.Getenv("AWS_RABBITMQ_URL")
	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		log.Printf("Failed to connect to RabbitMQ: %v", err)
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Printf("Failed to open a channel: %v", err)
		return err
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"private_chat_queue", // Queue name for private messages
		true,                 // Durable
		false,                // Delete when unused
		false,                // Exclusive
		false,                // No-wait
		nil,                  // Arguments
	)
	if err != nil {
		log.Printf("Failed to declare a queue: %v", err)
		return err
	}

	// Convert message to JSON format
	messageBody, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal private message: %v", err)
		return err
	}

	err = ch.Publish(
		"",     // Exchange
		q.Name, // Routing key (queue name)
		false,  // Mandatory
		false,  // Immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        messageBody,
		},
	)
	if err != nil {
		log.Printf("Failed to publish private message: %v", err)
		return err
	}

	fmt.Printf("Private message sent to RabbitMQ: %s\n", messageBody)
	return nil
}

// PublishGroupMessage publishes a group message to RabbitMQ
func PublishGroupMessage(msg models.GroupMessage) error {
	rabbitMQURL := os.Getenv("AWS_RABBITMQ_URL")
	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		log.Printf("Failed to connect to RabbitMQ: %v", err)
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Printf("Failed to open a channel: %v", err)
		return err
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"group_chat_queue", // Queue name for group messages
		true,               // Durable
		false,              // Delete when unused
		false,              // Exclusive
		false,              // No-wait
		nil,                // Arguments
	)
	if err != nil {
		log.Printf("Failed to declare a queue: %v", err)
		return err
	}

	// Convert message to JSON format
	messageBody, err := json.Marshal(msg)
	if err != nil {
		log.Printf("Failed to marshal group message: %v", err)
		return err
	}

	err = ch.Publish(
		"",     // Exchange
		q.Name, // Routing key (queue name)
		false,  // Mandatory
		false,  // Immediate
		amqp.Publishing{
			ContentType: "application/json",
			Body:        messageBody,
		},
	)
	if err != nil {
		log.Printf("Failed to publish group message: %v", err)
		return err
	}

	fmt.Printf("Group message sent to RabbitMQ: %s\n", messageBody)
	return nil
}

// StartConsumer starts listening for messages from RabbitMQ
func StartConsumer() {
	rabbitMQURL := os.Getenv("AWS_RABBITMQ_URL")
	conn, err := amqp.Dial(rabbitMQURL)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		log.Fatalf("Failed to open a channel: %v", err)
	}
	defer ch.Close()

	privateQueue, err := ch.QueueDeclare(
		"private_chat_queue",
		true,  // Durable
		false, // Delete when unused
		false, // Exclusive
		false, // No-wait
		nil,   // Arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare private chat queue: %v", err)
	}

	groupQueue, err := ch.QueueDeclare(
		"group_chat_queue",
		true,  // Durable
		false, // Delete when unused
		false, // Exclusive
		false, // No-wait
		nil,   // Arguments
	)
	if err != nil {
		log.Fatalf("Failed to declare group chat queue: %v", err)
	}

	privateMsgs, err := ch.Consume(
		privateQueue.Name,
		"",
		true,  // Auto-acknowledge messages
		false, // Exclusive
		false, // No-local
		false, // No-wait
		nil,   // Arguments
	)
	if err != nil {
		log.Fatalf("Failed to register private chat consumer: %v", err)
	}

	groupMsgs, err := ch.Consume(
		groupQueue.Name,
		"",
		true,  // Auto-acknowledge messages
		false, // Exclusive
		false, // No-local
		false, // No-wait
		nil,   // Arguments
	)
	if err != nil {
		log.Fatalf("Failed to register group chat consumer: %v", err)
	}

	forever := make(chan bool)

	// Handle private messages
	go func() {
		for d := range privateMsgs {
			var receivedMsg models.PrivateMessage
			err := json.Unmarshal(d.Body, &receivedMsg)
			if err != nil {
				log.Printf("Error parsing private message: %v", err)
				continue
			}

			fmt.Printf("Received private message: %+v\n", receivedMsg)

			// Push to WebSocket or save as notification
			if utils.IsUserOnline(receivedMsg.SenderID) {
				// utils.NotifyUser(receivedMsg.SenderID, receivedMsg)
			} else {
				// Save as unread notification if user is offline
				// Example: SaveNotification(receiverID, content)
			}
		}
	}()

	// Handle group messages
	go func() {
		for d := range groupMsgs {
			var receivedMsg models.GroupMessage
			err := json.Unmarshal(d.Body, &receivedMsg)
			if err != nil {
				log.Printf("Error parsing group message: %v", err)
				continue
			}

			fmt.Printf("Received group message: %+v\n", receivedMsg)

			// Push to WebSocket for all members or save as notification
			// services.ProcessGroupMessage(receivedMsg)
		}
	}()

	fmt.Println("RabbitMQ consumer started. Waiting for messages...")
	<-forever
}
