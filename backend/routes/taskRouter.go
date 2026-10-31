package routes

import (
	"projectup/controllers"
	"projectup/middleware"

	"github.com/gin-gonic/gin"
)

// SetupTaskRoutes sets up task management routes
func SetupTaskRoutes(router *gin.Engine, controller *controllers.TaskController) {
	taskGroup := router.Group("/api/tasks")
	taskGroup.Use(middleware.Authenticate())
	{
		// Task CRUD operations
		taskGroup.POST("", controller.CreateTask)
		taskGroup.GET("/:id", controller.GetTask)
		taskGroup.PUT("/:id", controller.UpdateTask)
		taskGroup.PATCH("/:id/status", controller.UpdateTaskStatus)
		taskGroup.PATCH("/:id/progress", controller.UpdateTaskProgress)
		taskGroup.DELETE("/:id", controller.DeleteTask)

		// Bulk operations
		taskGroup.PATCH("/bulk-update", controller.BulkUpdateTasks)
		taskGroup.DELETE("/bulk-delete", controller.BulkDeleteTasks)

		// Project tasks
		taskGroup.GET("/project/:project_id", controller.GetProjectTasks)
		taskGroup.GET("/project/:project_id/stats", controller.GetProjectTaskStats)
		taskGroup.GET("/project/:project_id/dependencies", controller.GetProjectDependencies)

		// Idea node tasks
		taskGroup.GET("/idea-node/:idea_node_id", controller.GetTasksByIdeaNode)

		// Subtask operations
		taskGroup.POST("/:id/subtasks", controller.CreateSubtask)
		taskGroup.GET("/:id/subtasks", controller.GetSubtasks)
		taskGroup.PUT("/:id/subtasks/:subtask_id", controller.UpdateSubtask)
		taskGroup.DELETE("/:id/subtasks/:subtask_id", controller.DeleteSubtask)

		// Learning resource operations
		taskGroup.POST("/:id/resources", controller.CreateLearningResource)
		taskGroup.GET("/:id/resources", controller.GetLearningResources)
		taskGroup.GET("/:id/resources/:resource_id", controller.GetLearningResource)
		taskGroup.PUT("/:id/resources/:resource_id", controller.UpdateLearningResource)
		taskGroup.POST("/:id/resources/:resource_id/complete", controller.MarkResourceComplete)
		taskGroup.DELETE("/:id/resources/:resource_id", controller.DeleteLearningResource)

		// Task dependency operations
		taskGroup.POST("/:id/dependencies", controller.AddTaskDependency)
		taskGroup.GET("/:id/dependencies", controller.GetTaskDependencies)
		taskGroup.GET("/:id/dependent-tasks", controller.GetDependentTasks)
		taskGroup.DELETE("/dependencies/:dependency_id", controller.RemoveTaskDependency)

		// Conversion operations
		taskGroup.POST("/:id/convert-to-milestone", controller.ConvertTaskToMilestone)
	}
}
