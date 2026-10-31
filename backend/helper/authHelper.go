package helper

import (
	"errors"
	"log"

	"golang.org/x/crypto/bcrypt"

	"github.com/gin-gonic/gin"
)

func CheckUserType(c *gin.Context, userType string) (err error) {
	role := c.GetString("Role")
	err = nil
	if userType != role {
		err = errors.New("unauthorized to access this resource")
		return err
	}
	return err
}

func MatchUserTypeToUid(c *gin.Context, userId string) (err error) {
	role := c.GetString("Role")
	uid := c.GetString("Uid")
	err = nil

	if role == "USER" && uid != userId {
		err = errors.New("unauthorized to access this resource")
		return err
	}
	err = CheckUserType(c, role)
	return err
}

func VerifyPassword(userPassword string, providedPassword string) (bool, error) {
	err := bcrypt.CompareHashAndPassword([]byte(providedPassword), []byte(userPassword))
	check := true
	msg := ""

	if err != nil {
		msg = "password is incorrect"
		check = false
	}

	return check, errors.New(msg)
}

func HashPassword(password string) string {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		log.Panic(err)
	}
	return string(bytes)
}
