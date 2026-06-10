-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Servidor: localhost:3306
-- Tiempo de generación: 29-05-2026 a las 02:36:09
-- Versión del servidor: 10.6.27-MariaDB
-- Versión de PHP: 8.4.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `arcusxon_users`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `admin_logs`
--

CREATE TABLE `admin_logs` (
  `id` int(11) NOT NULL,
  `admin_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `target_type` varchar(50) DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `details` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `admin_logs`
--

INSERT INTO `admin_logs` (`id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `user_agent`, `created_at`) VALUES
(1, 1, 'get_stats', NULL, NULL, NULL, '181.42.181.76', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 02:39:48'),
(2, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.181.76', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 02:39:54'),
(3, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '181.42.181.76', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 02:40:05'),
(4, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '181.42.181.76', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 02:40:11'),
(5, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.181.76', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-02-27 02:40:17'),
(6, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:36:57'),
(7, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:37:00'),
(8, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:37:08'),
(9, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:38:18'),
(10, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:38:45'),
(11, 1, 'get_task_details', 'task', 103, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:38:47'),
(12, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:39:06'),
(13, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:43:03'),
(14, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:43:09'),
(15, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:43:16'),
(16, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:43:40'),
(17, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:46:17'),
(18, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:46:28'),
(19, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:56:17'),
(20, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:56:23'),
(21, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:56:52'),
(22, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-20 18:57:13'),
(23, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 17:29:47'),
(24, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 17:29:54'),
(25, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 17:31:33'),
(26, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 17:32:56'),
(27, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:47:36'),
(28, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:47:41'),
(29, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:47:49'),
(30, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:49:18'),
(31, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:49:24'),
(32, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:49:47'),
(33, 1, 'get_task_details', 'task', 107, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 17:49:51'),
(34, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:07'),
(35, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:12'),
(36, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:21'),
(37, 1, 'get_users', 'users', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:29'),
(38, 1, 'get_user_details', 'user', 39, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:33'),
(39, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:43'),
(40, 1, 'get_task_details', 'task', 103, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:22:53'),
(41, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:23:09'),
(42, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:24:00'),
(43, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:24:05'),
(44, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:24:08'),
(45, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:24:09'),
(46, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:57:48'),
(47, 1, 'get_users', 'users', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:08'),
(48, 1, 'get_users', 'users', NULL, '{\"page\":3,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:20'),
(49, 1, 'get_users', 'users', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:33'),
(50, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:35'),
(51, 1, 'get_users', 'users', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:42'),
(52, 1, 'get_users', 'users', NULL, '{\"page\":3,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:44'),
(53, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:58:52'),
(54, 1, 'get_tasks', 'tasks', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:59:42'),
(55, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 18:59:51'),
(56, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:01:09'),
(57, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:01:30'),
(58, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:01:54'),
(59, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:02:17'),
(60, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:13:04'),
(61, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:13:10'),
(62, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:13:23'),
(63, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:14:36'),
(64, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:14:41'),
(65, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:14:48'),
(66, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:15:31'),
(67, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:16:03'),
(68, 1, 'get_task_details', 'task', 108, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:16:05'),
(69, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:16:25'),
(70, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:17:22'),
(71, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:17:24'),
(72, 1, 'get_user_details', 'user', 65, NULL, '201.149.59.246', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-21 19:17:27'),
(73, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:28:10'),
(74, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:28:44'),
(75, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:29:13'),
(76, 1, 'get_task_details', 'task', 108, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:29:26'),
(77, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:29:34'),
(78, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:30:25'),
(79, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:31:32'),
(80, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:31:36'),
(81, 1, 'get_user_details', 'user', 65, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:31:49'),
(82, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:32:22'),
(83, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:33:01'),
(84, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 19:33:34'),
(85, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:06:40'),
(86, 1, 'get_users', 'users', NULL, '{\"page\":2,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:07:01'),
(87, 1, 'get_users', 'users', NULL, '{\"page\":3,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:07:13'),
(88, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:14:44'),
(89, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:14:44'),
(90, 1, 'get_user_details', 'user', 67, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:15:52'),
(91, 1, 'update_user', 'user', 67, '{\"user_id\":67,\"username\":\"Luchi34\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:16:43'),
(92, 1, 'get_user_details', 'user', 67, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:16:43'),
(93, 1, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:16:43'),
(94, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:16:43'),
(95, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:16:49'),
(96, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:22:01'),
(97, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 20:22:01'),
(98, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:36:58'),
(99, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:36:58'),
(100, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:37:06'),
(101, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:37:06'),
(102, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:37:23'),
(103, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:37:28'),
(104, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:39:42'),
(105, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:39:42'),
(106, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:39:44'),
(107, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:39:45'),
(108, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:40:08'),
(109, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 21:40:13'),
(110, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:03:23'),
(111, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:03:23'),
(112, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:10'),
(113, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:10'),
(114, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:16'),
(115, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:20'),
(116, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:20'),
(117, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:28'),
(118, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:05:28'),
(119, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:31'),
(120, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:31'),
(121, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:39'),
(122, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:39'),
(123, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:49'),
(124, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Cursor/2.4.21 Chrome/142.0.7444.235 Electron/39.2.7 Safari/537.36', '2026-03-21 22:07:54'),
(125, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 22:56:37'),
(126, 1, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36', '2026-03-21 22:56:37'),
(127, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:46:32'),
(128, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:46:39'),
(129, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:46:42'),
(130, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:47:14'),
(131, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:47:22'),
(132, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:48:21'),
(133, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:48:49'),
(134, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 14:54:19'),
(135, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:10:02'),
(136, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:11:55'),
(137, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:11:58'),
(138, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:12:10'),
(139, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:12:11'),
(140, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:12:14'),
(141, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:12:22'),
(142, 4, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:29:12'),
(143, 4, 'get_stats', NULL, NULL, NULL, '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:30:35'),
(144, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:30:42'),
(145, 4, 'get_users', 'users', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:31:23'),
(146, 4, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":20}', '201.149.59.246', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36', '2026-03-22 15:32:27'),
(147, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:44:19'),
(148, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:44:19'),
(149, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:44:25'),
(150, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:44:25'),
(151, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:46:32'),
(152, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:46:34'),
(153, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:46:56'),
(154, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:46:57'),
(155, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:46:59'),
(156, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:00'),
(157, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:04'),
(158, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:04'),
(159, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:07'),
(160, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:07'),
(161, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:19'),
(162, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:19'),
(163, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:24'),
(164, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:24'),
(165, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:27'),
(166, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:27'),
(167, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:35'),
(168, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:35'),
(169, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:38'),
(170, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:38'),
(171, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:47'),
(172, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:48'),
(173, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:51'),
(174, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:51'),
(175, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:58'),
(176, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:47:58'),
(177, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:04'),
(178, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:04'),
(179, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:11'),
(180, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:11'),
(181, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:19'),
(182, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:19'),
(183, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:24'),
(184, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:24'),
(185, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:30'),
(186, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:30'),
(187, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:37'),
(188, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:37'),
(189, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:43'),
(190, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:43'),
(191, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:49'),
(192, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:49'),
(193, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:52'),
(194, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:48:52'),
(195, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:49:49'),
(196, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:49:49'),
(197, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:49:56'),
(198, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:49:56'),
(199, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:03'),
(200, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:03'),
(201, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:10'),
(202, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:10'),
(203, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:24'),
(204, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:24'),
(205, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:29'),
(206, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:29'),
(207, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:35'),
(208, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:35'),
(209, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:38'),
(210, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:42'),
(211, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:42'),
(212, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:48'),
(213, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:48'),
(214, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:55'),
(215, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:50:55'),
(216, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:01'),
(217, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:01'),
(218, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:07'),
(219, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:07'),
(220, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:14');
INSERT INTO `admin_logs` (`id`, `admin_id`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `user_agent`, `created_at`) VALUES
(221, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:14'),
(222, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:21'),
(223, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:21'),
(224, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:27'),
(225, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:27'),
(226, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:30'),
(227, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:51:30'),
(228, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:56:43'),
(229, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:56:44'),
(230, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:56:48'),
(231, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-06 23:56:48'),
(232, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:33'),
(233, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:38'),
(234, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:40'),
(235, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:46'),
(236, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:46'),
(237, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:49'),
(238, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:49'),
(239, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:53'),
(240, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:38:55'),
(241, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:04'),
(242, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:04'),
(243, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:11'),
(244, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:11'),
(245, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:14'),
(246, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:14'),
(247, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:34'),
(248, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:34'),
(249, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:37'),
(250, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:43:37'),
(251, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:44:57'),
(252, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:44:58'),
(253, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:45:03'),
(254, 1, 'get_stats', NULL, NULL, NULL, '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:45:04'),
(255, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:45:07'),
(256, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:45:07'),
(257, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:47:16'),
(258, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '181.42.134.50', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-07 00:47:19'),
(259, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:05'),
(260, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:06'),
(261, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:11'),
(262, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:12'),
(263, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:34'),
(264, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:34'),
(265, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:38'),
(266, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:ad66:9305:c6c1:9012', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 17:49:38'),
(267, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:10:24'),
(268, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:10:24'),
(269, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:10:29'),
(270, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:10:29'),
(271, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:15:20'),
(272, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:15:20'),
(273, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:15:24'),
(274, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8497:4b16:ea18:e77d', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:15:24'),
(275, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:19:43'),
(276, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:19:45'),
(277, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:21:44'),
(278, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:21:44'),
(279, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:21:48'),
(280, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:21:49'),
(281, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:23:57'),
(282, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:23:57'),
(283, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:24:01'),
(284, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:24:01'),
(285, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:04'),
(286, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:06'),
(287, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:12'),
(288, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:12'),
(289, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:16'),
(290, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:25:16'),
(291, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:08'),
(292, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:09'),
(293, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:13'),
(294, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:13'),
(295, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:25'),
(296, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:25'),
(297, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:28'),
(298, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:cd7e:7faa:2d63:1cc0', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:27:28'),
(299, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:30:58'),
(300, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:31:00'),
(301, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:38:22'),
(302, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:38:23'),
(303, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:38:27'),
(304, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:38:27'),
(305, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:39:03'),
(306, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:39:07'),
(307, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:39:07'),
(308, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:39:10'),
(309, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:39:10'),
(310, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:43:50'),
(311, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:43:50'),
(312, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:43:54'),
(313, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:43:54'),
(314, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:08'),
(315, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:09'),
(316, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:16'),
(317, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:16'),
(318, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:48'),
(319, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:48'),
(320, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:51'),
(321, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 22:51:52'),
(322, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:03:49'),
(323, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:03:53'),
(324, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:06:15'),
(325, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:6daf:6a05:e787:f001', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:06:21'),
(326, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:20:33'),
(327, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:20:37'),
(328, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:21:42'),
(329, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:21:46'),
(330, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:21:49'),
(331, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:24:19'),
(332, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:398b:cb86:1814:7a86', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:24:23'),
(333, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:a43a:fd76:5fb1:cc07', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:40:39'),
(334, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:58:21'),
(335, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-17 23:59:57'),
(336, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:00:01'),
(337, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:02:06'),
(338, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:02:09'),
(339, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:02:13'),
(340, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:03:38'),
(341, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:359b:cec7:a55d:d969', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:03:43'),
(342, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0::11', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:07:35'),
(343, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0::11', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:07:39'),
(344, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:18:38'),
(345, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:18:44'),
(346, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:18:47'),
(347, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:19:17'),
(348, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:19:36'),
(349, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:20:35'),
(350, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:20:37'),
(351, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:483:7f0f:c520:6c45', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 00:22:17'),
(352, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:cc9e:a9bf:9d0:a20', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 01:31:38'),
(353, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 01:59:47'),
(354, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 01:59:52'),
(355, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:01:07'),
(356, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:01:12'),
(357, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:02:40'),
(358, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:02:44'),
(359, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:14:13'),
(360, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:14:19'),
(361, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:40:36'),
(362, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:8089:ff6c:feba:c6b4', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 02:43:28'),
(363, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:df7:2348:aaa:74df', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 03:35:52'),
(364, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:df7:2348:aaa:74df', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-18 03:35:59'),
(365, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:f8d0:b38f:36ac:d4f9', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-19 03:32:05'),
(366, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:f8d0:b38f:36ac:d4f9', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36', '2026-05-19 03:32:09'),
(367, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:c06b:b06f:6f51:48dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-22 16:46:13'),
(368, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:c06b:b06f:6f51:48dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-22 16:46:19'),
(369, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:c06b:b06f:6f51:48dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-22 16:46:47'),
(370, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:584d:1108:b7e3:7c6e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 03:08:24'),
(371, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:584d:1108:b7e3:7c6e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 03:08:29'),
(372, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:584d:1108:b7e3:7c6e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 03:08:50'),
(373, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:30:17'),
(374, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:30:22'),
(375, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:30:39'),
(376, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:30:54'),
(377, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":1000,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:31:38'),
(378, 1, 'get_escrows', 'escrows', NULL, '{\"page\":1,\"limit\":20,\"escrow_status\":\"\",\"task_status\":\"\"}', '2800:300:66d1:65f0:1864:9b26:6c0e:e7dc', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-24 20:32:11'),
(379, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:fdef:dd2:2d68:791e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 02:02:34'),
(380, 1, 'get_stats', NULL, NULL, NULL, '2800:300:66d1:65f0:fdef:dd2:2d68:791e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 02:02:34'),
(381, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:fdef:dd2:2d68:791e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 02:02:40'),
(382, 1, 'get_tasks', 'tasks', NULL, '{\"page\":1,\"limit\":1000}', '2800:300:66d1:65f0:fdef:dd2:2d68:791e', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36', '2026-05-28 02:02:40');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `applications`
--

CREATE TABLE `applications` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `portfolio_url` varchar(500) DEFAULT NULL,
  `worker_wallet_address` varchar(255) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `applications`
--

INSERT INTO `applications` (`id`, `task_id`, `applicant_id`, `message`, `portfolio_url`, `worker_wallet_address`, `status`, `created_at`) VALUES
(103, 98, 3, 'x', 'https://ASDDASDAS.COM', 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D', 'pending', '2026-01-17 02:06:48'),
(104, 99, 6, 'ojdfdsfdofds', 'https://sjjsadjsajds.com', 'GBMGKSDMNDDXWGWMUXOSGOR7ZD6R4UGJI7KUXQDEX2GHHMAK7VRXM5RK', 'pending', '2026-01-24 02:07:45'),
(106, 102, 1, 'Me gustaria trabajar aqui, tengo una amplia experiencia en el mundo web3 para poder aportar', 'https://github.com/wrever/', 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D', 'accepted', '2026-03-01 02:24:11'),
(107, 99, 24, 'm', 'https://arcusx.pro/apply-task/99', 'GD3W6NLR56HJMMKDCMHQTMEXJ3ADPZXFPGVZZAUYMAXGJEYBDUT3VBKF', 'pending', '2026-03-07 03:49:58'),
(110, 103, 1, 'Jdkskd', 'https://kdkskfks.com', 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D', 'accepted', '2026-03-20 18:31:49'),
(112, 105, 21, 'Jejqkd', 'https://fjskkd.com', 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D', 'pending', '2026-03-20 18:58:01'),
(113, 106, 4, 'jsifjdf', 'https://sjjsadjsajds.com', 'GBMGKSDMNDDXWGWMUXOSGOR7ZD6R4UGJI7KUXQDEX2GHHMAK7VRXM5RK', 'pending', '2026-03-21 17:41:59'),
(115, 108, 21, 'jjdfjfjfdf', 'https://ASDDASDAS.COM', 'GA7UTLCKIPSQSCRLILQKZGE24X5CBAH32C7NJEZ2NKQLTB4OZDINXL3D', 'accepted', '2026-03-21 19:11:40'),
(116, 98, 76, 'Hola, quiero aplicar a esta tarea.\\n\\nMe interesa trabajar con proyectos web3 porque me gusta la estética, la narrativa y la velocidad con la que se mueve este ecosistema. Puedo crear diseños visualmente atractivos, modernos y claros, enfocados en comunicar bien la propuesta del proyecto y generar una mejor presencia de marca.\\n\\nTengo buena capacidad para seguir briefs, adaptar estilos, iterar rápido y entregar piezas limpias y funcionales. Más que hacer “diseños bonitos”, busco que cada pieza cumpla un objetivo: captar atención, transmitir confianza y reforzar identidad.\\n\\nSi buscan a alguien comprometido, con criterio visual y buena disposición para ejecutar, puedo aportar.\\n\\nQuedo atento.', NULL, 'GCJQ4F7L44EPLRCGASDNT45ML2SIYP62I2LSWXZYVXL45LJIF7I6DOIC', 'pending', '2026-03-30 03:09:19'),
(117, 106, 76, 'Hola, me interesa participar en la creación de esta campaña.\\n\\nCuento con experiencia en marketing digital enfocado en adquisición de usuarios y comunicación de propuestas de valor, especialmente en entornos donde es necesario simplificar conceptos complejos.\\n\\nPuedo contribuir en la planificación y ejecución de una campaña clara, estructurada y orientada a resultados, considerando tanto el mensaje como la experiencia del usuario.\\n\\nMi enfoque combina:\\n\\nEstrategia de contenido\\nClaridad comunicacional\\nAdaptación a feedback y métricas\\n\\nEstoy disponible para colaborar de forma eficiente y alineada a los objetivos del proyecto.\\n\\nQuedo atento.', NULL, 'GCJQ4F7L44EPLRCGASDNT45ML2SIYP62I2LSWXZYVXL45LJIF7I6DOIC', 'pending', '2026-03-30 03:10:39'),
(118, 106, 83, 'Hola. voy con todo.', NULL, 'GDR6BHZKZCUU2OPTU7WQNGHOZIUSUDTSGK7KYJRPMF6AYE2JPXFDLVXY', 'pending', '2026-04-18 01:41:58'),
(119, 106, 91, 'X', NULL, 'GDFD3FA6JCFKJ7PB6VSVFSMYS22G6J7SHOLOAN72KG3BMOBOMDD2TYGL', 'pending', '2026-05-01 16:06:46'),
(120, 110, 91, 'Me interesa la oportunidad porque me gusta crear propuestas visuales claras, atractivas y alineadas con la identidad de una marca. Considero que puedo aportar creatividad, atención al detalle y muchas ganas de aprender.', NULL, 'GDFD3FA6JCFKJ7PB6VSVFSMYS22G6J7SHOLOAN72KG3BMOBOMDD2TYGL', 'pending', '2026-05-01 16:12:23'),
(121, 105, 102, 'Hola, Toph. Estoy interesado en colaborar en este desarrollo de prueba. Tengo experiencia previa trabajando con aplicaciones descentralizadas y me gustaría ayudar a validar el flujo de esta tarea en la plataforma. Soy detallista, manejo bien los tiempos de entrega y estoy listo para comenzar de inmediato. ¡Saludos!', 'https://github.com/JohannPrimera', 'GBEN6UVGXKJFN36ZW4KYZZWQ4RKFFZVT2ZKQGKUKUNVU3UM55QDI7SWO', 'pending', '2026-05-02 13:08:24'),
(122, 101, 102, 'Hola, Admin. Me motiva mucho esta oportunidad de practicante Web3. Soy desarrollador web con experiencia creando y desplegando aplicaciones full-stack, incluyendo proyectos con Node.js, Express y MongoDB. Recientemente trabajé en el desarrollo de una landing page de e-commerce utilizando React y Tailwind CSS, desplegada en Vercel.\\n\\nAdemás de mi formación técnica, tengo experiencia previa en agencias de marketing, lo que me permite entender no solo el código, sino también los objetivos del producto. Estoy muy familiarizado con el ecosistema y listo para aportar mis habilidades técnicas a la plataforma. ¡Quedo atento!', 'https://github.com/JohannPrimera', 'GBEN6UVGXKJFN36ZW4KYZZWQ4RKFFZVT2ZKQGKUKUNVU3UM55QDI7SWO', 'pending', '2026-05-02 13:09:51'),
(123, 99, 96, 'Soy Desarrollador Full Stack con certificado. He trabajado con JavaScript, HTML, CSS, BootStrap, React, NodeJs, ExpressJS y MongoDB en proyectos peresonales de práctica. Mi objetivo principal entregar un trabajo de calidad y también aumentar mis habilidades en el desarrollo.', NULL, 'GAPJMAUNX7TEO22KUK6FVJIKPCFPTSZ2SZLTA7TYW2DPTCYDZUMM265X', 'pending', '2026-05-02 15:05:42'),
(124, 110, 96, 'He trabajado por más de 5 años con Canva en incontables proyectos de mi universidad, se manejarme en la plataforma para la creación de logos, flyers, documentos, infografías, afiches, folletos, etc. También he trabajado con herramientas de dibujo vectorial como Inkscape', NULL, 'GAPJMAUNX7TEO22KUK6FVJIKPCFPTSZ2SZLTA7TYW2DPTCYDZUMM265X', 'pending', '2026-05-02 15:07:50'),
(125, 105, 106, 'Cuento con habilidades técnicas y experiencia en desarrollo de software para pequeñas y medianas empresas. Tengo habilidad en la resolución de problemas complejos.', 'https://github.com/Kerwin2712', 'GCR7TJ6ZDCEED4PAWM55IWWXP3DTDEDIL4AT7WQXN3DVPPVLFGDZEF32', 'pending', '2026-05-02 18:42:56'),
(126, 99, 106, 'Cuento con experiencia en desarrollo de software, he creado sistemas para gestionar recursos empresariales, trabajo con optimización de sistemas y solución de bugs', 'https://github.com/Kerwin2712', 'GCR7TJ6ZDCEED4PAWM55IWWXP3DTDEDIL4AT7WQXN3DVPPVLFGDZEF32', 'pending', '2026-05-02 19:03:28'),
(127, 106, 116, 'I have experience in digital marketing and content creation, working with organizations like Ethereum México.', 'https://www.linkedin.com/in/valeria-ortiz-montiel-aa7b82286/', 'GDPCM7PQXG74JZ5BHLDDEQUEDEPCIEJLMF4ZX5WMKEQBK6ATQC6NYXGE', 'pending', '2026-05-04 02:05:49'),
(128, 99, 130, 'Mi nombre es Sebastián Camero, Ingeniero de Software especializado en la construcción de arquitecturas backend escalables, seguras y de alto rendimiento.\\n\\nDurante los últimos 3+ años, he operado como contratista B2B diseñando el núcleo de plataformas complejas. Mi experiencia en backend se centra en:\\n\\n*   **Arquitectura y APIs:** Desarrollo y consumo de APIs robustas (REST y GraphQL) utilizando **Node.js y NestJS**, aplicando principios de código limpio, inyección de dependencias y separación de responsabilidades.\\n*   **Bases de Datos y Tiempo Real:** Diseño de esquemas relacionales en **PostgreSQL** y manejo de datos no relacionales de alta concurrencia en **MongoDB**. Además, he implementado arquitecturas de comunicación bidireccional mediante **WebSockets** para sistemas de chat y notificaciones instantáneas.\\n*   **Seguridad y Datos Sensibles:** Recientemente, lideré la integración y arquitectura de un sistema tipo ERP a medida para el sector gubernamental en Colombia (UGPP), garantizando la integridad y persistencia de altos volúmenes de datos financieros.\\n\\nMe considero un profesional con una fuerte mentalidad de producto (Product Mindset), alta capacidad de autogestión y totalmente adaptado a entornos asíncronos 100% remotos.', 'https://portfolio-sebastian-henna.vercel.app/', 'GCXVCOIJ2KVVEGVAVKY3Y37CCHQN5D7P4XCA3ARF2D627G7G2KHXYSOW', 'pending', '2026-05-04 12:40:55'),
(129, 110, 139, 'Hola soy nuevo en la plataforma y me interesa tu proyecto, tengo habilidades que pueden ser muy útiles para el diseño', NULL, 'GCDWZJYLHPRANS2BYJHWFFOPYNNWJYWLNHB47HFTRWIYTFEVUXJUDRKY', 'pending', '2026-05-04 19:19:37'),
(130, 101, 144, 'Estudiante de Ingeniería de Sistemas con sólida formación técnica en el desarrollo de \\naplicaciones web y plataformas tecnológicas. Cuento con experiencia comprobable en el stack \\nMERN (React y Node.js), gestión de bases de datos SQL y automatización de procesos mediante \\nn8n e Inteligencia Artificial. Me caracterizo por mi capacidad analítica para la resolución de \\nproblemas, responsabilidad y comunicación asertiva en entornos ágiles. Poseo un fuerte interés \\nen la arquitectura de software, el desarrollo Full Stack y la optimización de sistemas.', 'https://github.com/Juan-Montealegre', 'GACOG4QKI6K2PPFQMVVVU6N2LVQV47O6ZM35PRQLTCPASU7I3BV2QALH', 'pending', '2026-05-04 22:37:10'),
(131, 101, 157, 'Soy un estudiante avanzado de la carrera de ingeniería en Sistemas de Información, con conocimientos sólidos en conceptos de programación y buenas prácticas, adaptado a tecnologías modernas.', NULL, 'GDYJG5VQZIY6WKU56T4FLL7M6LZJOZZZKCDBYFWNYLX3ZDUOSHR23YYV', 'pending', '2026-05-05 17:07:38'),
(132, 99, 159, 'I’m a systems engineer with +3 years of experience developing apps, designing web and APIs to make reliable and trustfull apps', 'https://jesustoussaintportfolio.vercel.app', 'GA75IAJU6VIDOTQAESXECYXWS3FRJYTY24YPVTKGO3JWSCY573SSCR6C', 'pending', '2026-05-05 17:38:54'),
(133, 101, 159, 'Im a systems engineer i can help', 'https://jesustoussaintportfolio.vercel.app', 'GA75IAJU6VIDOTQAESXECYXWS3FRJYTY24YPVTKGO3JWSCY573SSCR6C', 'pending', '2026-05-05 17:41:21'),
(134, 101, 168, 'si', 'https://francozeta.vercel.app', 'GBTJPAM5OO7ARTJ3SC3RKWS6YIAJDXDOTGXWPEH36ETDJ7GETOL2BQKM', 'pending', '2026-05-05 20:02:01'),
(135, 99, 172, 'Buen día, soy desarrollador especialzado en desarrollo Backend con Go y Java enfocado en la seguridad de datos. \\nHe desarrollado paginas web integrando APIs de LLMs como Gemini para automatizar procesos de negocios, e-commerce para tiendas apoyando desde la planificacion hasta el despliegue, proyectos de ciencia de datos y desarrollo de bots.', NULL, 'GBKKPQTT7ECCUVEC77A4XANDXFHJXI3EFUQFUZQUKCRSSQ6GGZN7R3US', 'pending', '2026-05-06 01:49:57'),
(136, 105, 187, '¡Hola! Soy estudiante de Informática y me gustaría encargarme de este desarrollo de prueba. Tengo experiencia técnica sólida y puedo entregarte una app funcional rápidamente para que valides el sistema. Estoy listo para empezar de una vez.', 'https://github.com/Juan23456788977/Portafolio', 'GBQ5K5ZKGDCO4NYHWTO5PTAHZE4KX2O7HHISXNYPLEBL3IMARBOYEQGG', 'pending', '2026-05-06 14:29:31'),
(137, 101, 187, '¡Hola! Soy estudiante de 6to año de Informática y actualmente me desempeño como pasante de desarrollo. Me interesa mucho esta oportunidad porque combino dos de mis grandes pasiones: la programación y el ecosistema Web3.\\n\\nTengo experiencia técnica sólida en JavaScript, Node.js y bases de datos, herramientas clave para conectar plataformas con la blockchain. Además, entiendo bien el funcionamiento de los activos digitales y las redes, ya que opero activamente con criptomonedas y bots de trading. He desarrollado proyectos integrales desde cero (como mi sistema de tesis PasantConnect), lo que me da la capacidad de adaptarme rápido a los flujos de trabajo de una plataforma Web3.\\n\\nSoy una persona proactiva, detallista y con muchas ganas de aportar mi talento técnico a este proyecto. ¡Espero podamos trabajar juntos!\\\"', 'https://github.com/Juan23456788977/Portafolio', 'GBQ5K5ZKGDCO4NYHWTO5PTAHZE4KX2O7HHISXNYPLEBL3IMARBOYEQGG', 'pending', '2026-05-06 14:33:06'),
(138, 110, 189, 'Hola, mi nombre es Felipe.\\n\\nMe gustaría postularme para realizar la tarea de diseño de logo. Cuento con experiencia en creación de identidad visual, diseño de piezas gráficas y desarrollo de marcas para negocios, emprendimientos y proyectos digitales.\\n\\nPuedo ayudarte a crear un logo profesional, moderno y alineado con la imagen que quieres transmitir. Mi enfoque es entender primero la esencia del proyecto, el público objetivo y el estilo deseado, para luego desarrollar una propuesta visual clara, atractiva y fácil de recordar.\\n\\nMe comprometo a entregar un diseño cuidado, prolijo y adaptable para distintos usos, como redes sociales, página web, tarjetas, perfiles comerciales o material publicitario.\\n\\nQuedo a disposición para conversar sobre la idea, referencias, colores y estilo que buscas para el logo.\\n\\nSaludos,\\nFelipe', 'https://github.comrepositories/FelipeMartinis?tab=', 'GBVM5LJ2KBB4IJBMYB7RLMKILFX5OIUUTFU7DH25JZ2LPEFG5RZOUTVX', 'pending', '2026-05-06 14:58:08'),
(139, 105, 194, 'Te puedo ayudar con lo que sea', 'https://portafoliojesusserrano.netlify.app/', 'GB2G522HBXO3JAH6I6VGXHY4OL2OGXFYBBEJWH6S2VVKZIIEN54ML7BO', 'pending', '2026-05-06 17:49:36'),
(140, 105, 138, 'Como estudiante de ingeniería en informática, se me exige constantemente crear soluciónes a problemas y adaptarme a escenarios diversos con estrategias útiles.\\n\\nMe tomo muy enserio el desarrollo de todo tipo de aplicaciones, ya sean ejercicios de guía o proyectos propios.', 'https://portafolio-dereck-gomez-disaw.vercel.app/', 'GCAWVZITVYZ4QNENXAVIFSWWZ3RMJMTO7VLUQ5GPAVXSWMUZ5NM2DZ3M', 'pending', '2026-05-07 14:33:40'),
(141, 101, 138, 'Soy estudiante de Ingeniería en Informática. Tengo conocimientos sobre lenguajes de programación como C/C++ además de un gran entendimiento de la lógica de programación.\\n\\nEl ámbito web3, aunque nuevo para mí, es una gran oportunidad para desarrollar y ampliar mis habilidades.', 'https://portafolio-dereck-gomez-disaw.vercel.app/', 'GCAWVZITVYZ4QNENXAVIFSWWZ3RMJMTO7VLUQ5GPAVXSWMUZ5NM2DZ3M', 'pending', '2026-05-07 14:38:12'),
(142, 99, 213, 'test de aplicacion de tarea', NULL, 'GDU4D7BPCGXXELMXN32IFVXDPW5F5V3RBUVZQCCK3A5Y5QXMN3OL5ODR', 'pending', '2026-05-07 17:32:21'),
(143, 105, 213, 'aceptame en esta tarea por favor', NULL, 'GDU4D7BPCGXXELMXN32IFVXDPW5F5V3RBUVZQCCK3A5Y5QXMN3OL5ODR', 'pending', '2026-05-07 17:32:47'),
(144, 98, 213, 'A la plataforma le hace falta muchisimo aun para que salga a produccion, tiene varios detalles visuales y de logica en varias partes. Por ejemplo para volver a crear otra tarea me dice: Próxima tarea disponible: 2026-05-07 19:28:57: Y tengo un cooldown de 1 hora y pico, lo cual esta bien, pero la fecha no esta correctamente formateada a mi hora local, deberia poder crear tarea a las 14:00 no a las 19:00 y hay mucha data de prueba aun, no deberia ser tan permisiva con los nuevos usuarios cualquiera podria venir y poner cualquier cosa. No me genera suficiente confianza como para usarla y meter dinero.', NULL, 'GDU4D7BPCGXXELMXN32IFVXDPW5F5V3RBUVZQCCK3A5Y5QXMN3OL5ODR', 'pending', '2026-05-07 17:38:05'),
(145, 101, 120, 'Tengo conocimiento en programacion, me gustaria aprender a desarrollar aplicaciones para la web3, he desarrollado aplicaciones personales y para algunos conocidos pero nada relacionado a la web3, me gustaria ganar algo de experiencia y conocimiento', 'https://cllojan.vercel.app/', 'GBBICUKZBDSTEHV54IQMNHOOPONDJMBFQZBZYKBZEMXFJI5HUMMAK3KQ', 'pending', '2026-05-08 14:45:39'),
(146, 101, 24, 'i am', 'https://arcusx.pro/apply-task/101', 'GC24PMP3JK643ABMPMPJ4552TSA4A26T3HL4VZDBTRMGDHRFEB2AQ6AB', 'pending', '2026-05-08 22:46:48'),
(147, 98, 244, 'Me encuentro disponible y con experiencia en el rubro.', 'https://mentemaestra.studio', 'GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6', 'pending', '2026-05-10 19:08:37'),
(148, 101, 247, '¡Buenas! Soy estudiante de Ingeniería de Computación y tengo una base sólida en lógica de programación y desarrollo (C/C++). Aunque mi fuerte es el software de sistemas, manejo los fundamentos web y estoy buscando mi primera oportunidad en la plataforma para demostrar mi responsabilidad y capacidad de resolución. Soy proactivo, aprendo rápido y estoy disponible para ejecutar la tarea de inmediato.', NULL, 'GBKFIWSJUT7OHCS6QXCSPS3E2MZQM5E7JEUXNGLI5AJSVPJ4AOJHENVE', 'pending', '2026-05-11 12:04:45'),
(149, 110, 274, 'Dear Hiring Manager,\\nI am applying for the Graphic Designer position at your company. I believe I am a good fit for this role because I have practical experience in graphic design and I understand how to create designs that are both creative and effective.\\nOver time, I have worked on different types of design projects including social media posts, flyers, branding materials, and video graphics. These experiences have helped me improve my creativity, communication, and attention to detail. I always try to make sure my designs match the message and audience they are meant for.\\nOne thing that makes me stand out is my willingness to learn and improve. I take feedback seriously, work well under pressure, and always aim to deliver quality work on time. I also enjoy working with ideas and turning them into visuals that people can connect with.\\nI would appreciate the opportunity to contribute my skills and grow with your team. Thank you for your time and consideration. I look forward to hearing from you.\\nSincerely,\\nToritsesan Excellent Miki.', 'https://drive.google.com/drive/folders/1wtg9n5C4IEMWWsNTCrBAhsuHqsy84Urn', 'GBSFZR6LBNQ73NRGD4ACTDLIBQPNCDBYBQCPSRUZ45EHM3S7CKIFMUN4', 'pending', '2026-05-14 16:32:00'),
(150, 98, 274, 'Dear Hiring Manager,\\n\\nI am applying for the Graphic Designer position at your company. I believe I am a good fit for this role because I have practical experience in graphic design and I understand how to create designs that are both creative and effective.\\n\\nOver time, I have worked on different types of design projects including social media posts, flyers, branding materials, and video graphics. These experiences have helped me improve my creativity, communication, and attention to detail. I always try to make sure my designs match the message and audience they are meant for.\\n\\nOne thing that makes me stand out is my willingness to learn and improve. I take feedback seriously, work well under pressure, and always aim to deliver quality work on time. I also enjoy working with ideas and turning them into visuals that people can connect with.\\n\\nI would appreciate the opportunity to contribute my skills and grow with your team. Thank you for your time and consideration. I look forward to hearing from you.\\n\\nSincerely,\\nToritsesan Excellent Miki.', 'https://drive.google.com/drive/folders/1wtg9n5C4IEMWWsNTCrBAhsuHqsy84Urn', 'GBIO4BG4CHWLGHXDR7ITU3HZN76DJAR727HC7LDTUXNDDSQEEUUTTIJT', 'pending', '2026-05-14 16:43:26'),
(151, 111, 274, 'Dear Hiring Manager,\\n\\nI am applying for the Graphic Designer position at your company. I believe I am a good fit for this role because I have practical experience in graphic design and I understand how to create designs that are both creative and effective.\\n\\nOver time, I have worked on different types of design projects including social media posts, flyers, branding materials, and video graphics. These experiences have helped me improve my creativity, communication, and attention to detail. I always try to make sure my designs match the message and audience they are meant for.\\n\\nOne thing that makes me stand out is my willingness to learn and improve. I take feedback seriously, work well under pressure, and always aim to deliver quality work on time. I also enjoy working with ideas and turning them into visuals that people can connect with.\\n\\nI would appreciate the opportunity to contribute my skills and grow with your team. Thank you for your time and consideration. I look forward to hearing from you.\\n\\nSincerely,\\nToritsesan Excellent Miki', 'https://drive.google.com/drive/folders/1wtg9n5C4IEMWWsNTCrBAhsuHqsy84Urn', 'GBIO4BG4CHWLGHXDR7ITU3HZN76DJAR727HC7LDTUXNDDSQEEUUTTIJT', 'pending', '2026-05-14 17:05:05'),
(152, 99, 292, 'Soy un programador full stack con una pasión por las tecnologías emergentes y una inquietud por desarrollar soluciones innovadoras. Estoy comprometido a aprender y desarrollar mis habilidades como programador. He estado trabajando con lenguajes de programación tales como Java, JavaScript y HTML para desarrollar aplicaciones y sitios web. Estoy interesado en la creación de aplicaciones móviles y trabajando con la nube para crear servicios de almacenamiento seguros. Estoy comprometido a seguir aprendiendo y desarrollando mis habilidades como programador.', 'https://drive.google.com/file/d/1qt5YmrmHyhgVylavUm2oOgxoA8nt0MVa/view?usp=sharing', 'GARMB7W3FCR3GKIM3FLWVJASC2PUZ4VHUJZTNJVWWKNTCJNKO6TBCT76', 'pending', '2026-05-15 02:50:53'),
(153, 99, 296, 'Soy Embajador de Cursor y tengo habilidades de full stack.', 'https://kleosr.surge.sh/', 'GCGMGALCBGR322JRCSOJAFACXV3SMMJZNXHWJ2CUUPZEFASZMIUMEMGV', 'pending', '2026-05-15 13:42:42'),
(154, 99, 311, 'I\\\'m a Full Stack Developer with more than two years of experience working with frameworks like Node.js and Laravel. I specialize in building web applications and managing SQL and NoSQL databases', 'https://albertodpm30.github.io/alberto-perez/', 'GABFQIK63R2NETJM7T673EAMZN4RJLLGP3OFUEJU5SZVTGWUKULZJNL6', 'pending', '2026-05-15 23:56:16'),
(155, 101, 322, 'Soy estudiante de Ingeniería en Sistemas de Computación con conocimientos en desarrollo web y tecnologías frontend, incluyendo HTML, CSS, JavaScript y React. Además, he trabajado en proyectos académicos y personales relacionados con interfaces web, consumo de APIs y mejora de experiencia de usuario, lo que me ha permitido fortalecer mis bases en desarrollo moderno.\\n\\nMe considero una persona proactiva, autodidacta y con gran interés en aprender tecnologías emergentes como Web3 y blockchain. Tengo facilidad para adaptarme rápidamente a nuevas herramientas y entornos de desarrollo, además de buenas habilidades para trabajar en equipo y resolver problemas técnicos.\\n\\nConsidero que esta práctica representa una excelente oportunidad para seguir creciendo profesionalmente mientras aporto compromiso, responsabilidad y muchas ganas de aprender dentro del área de desarrollo Web3.', 'https://kevinperez-dev.netlify.app/', 'GDTSDQ6F34QE2W3377IFTX6W4Z4EPC3BIMV7KUNVF7CU35HPR34ZCE53', 'pending', '2026-05-16 07:31:38'),
(156, 99, 325, 'Estimado/a,\\n\\nMi nombre es Alexis Kremis y soy desarrollador backend Java SSR con experiencia en desarrollo de aplicaciones empresariales y sistemas distribuidos.\\n\\nDurante mi experiencia profesional trabajé en proyectos relacionados con banca, e-commerce y plataformas corporativas, utilizando tecnologías como Java, Spring Boot, APIs REST, microservicios, JPA/Hibernate, SQL y arquitecturas backend escalables.\\n\\nActualmente estoy interesado en participar en proyectos freelance donde pueda aportar:\\n\\n- Desarrollo de APIs y servicios backend\\n- Integración de sistemas\\n- Diseño de arquitectura backend\\n- Optimización y mantenimiento de aplicaciones\\n- Implementación de autenticación y seguridad\\n- Desarrollo de soluciones cloud-ready y escalables\\n\\nMe caracterizo por adaptarme rápido a nuevos entornos, priorizar código mantenible y trabajar orientado a resultados y calidad técnica.\\n\\nQuedo a disposición para conversar sobre el proyecto y cómo puedo colaborar.\\n\\nSaludos cordiales,\\nAlexis Kremis', 'https://portfolio-two-mauve-qylh3w7vc6.vercel.app/', 'GB5R3CLOMWDVKPGTKUZQPHDKNKIW3I64L2CBL7DZA4EKCKS3BYREDDMN', 'pending', '2026-05-16 14:40:24'),
(157, 101, 327, 'Hola! Mi nombre es Axel.\\n\\nActualmente trabajo en desarrollo, participando en resolución de bugs, testing, análisis de requerimientos y mejoras sobre sistemas reales de ecommerce y ERP.\\n\\nTengo experiencia con JavaScript, Node.js y Vue, y estoy acostumbrado a trabajar resolviendo problemas reales y colaborando en equipo.\\n\\nPodés ver algunos de mis proyectos acá:\\nhttps://github.com/axelnz\\n\\nEstoy interesado en seguir aprendiendo y aportar valor desde lo técnico y la resolución de problemas.\\n\\nGracias por considerar mi aplicación!', 'https://github.com/axelnz', 'GDX3PFZQURFK3LZ3UREDC52QUI5KOYIGVYARKBCRXOY6NKY64A5PE5N2', 'pending', '2026-05-16 19:34:09'),
(158, 98, 327, 'Hola! Mi nombre es Axel.\\n\\nSi bien mi perfil principal es desarrollo, tengo buen criterio visual y experiencia trabajando con interfaces, especialmente en proyectos web donde priorizo la claridad, usabilidad y orden visual.\\n\\nEstoy acostumbrado a trabajar con frontend (Vue, Tailwind) y entiendo cómo llevar diseños a algo funcional, lo que me permite aportar valor también desde el lado del diseño práctico.\\n\\nPuedo adaptarme rápido a lo que necesiten y trabajar en equipo para lograr un resultado claro y prolijo.\\n\\nPodés ver mis proyectos acá:\\nhttps://github.com/axelnz\\n\\nGracias por considerar mi aplicación!', 'https://github.com/axelnz', 'GDX3PFZQURFK3LZ3UREDC52QUI5KOYIGVYARKBCRXOY6NKY64A5PE5N2', 'pending', '2026-05-16 19:42:37'),
(159, 106, 327, 'Hola! Mi nombre es Axel.\\n\\nActualmente trabajo en desarrollo, participando en análisis de requerimientos, testing y mejoras sobre sistemas reales de ecommerce y ERP.\\n\\nSi bien mi perfil es técnico, tengo una buena visión de producto y experiencia trabajando con interfaces, lo que me permite aportar en campañas desde el lado práctico: entendiendo al usuario, cómo se usan las plataformas y qué comunicar.\\n\\nPuedo ayudar a estructurar ideas, mensajes claros y propuestas alineadas con el producto.\\n\\nPodés ver mis proyectos acá:\\nhttps://github.com/axelnz\\n\\nGracias por considerar mi aplicación!', 'https://github.com/axelnz', 'GDX3PFZQURFK3LZ3UREDC52QUI5KOYIGVYARKBCRXOY6NKY64A5PE5N2', 'pending', '2026-05-16 19:45:44'),
(160, 99, 327, 'Soy Axel, desarrollador backend con experiencia en Node.js trabajando en ecommerce y ERP, enfocado en APIs, debugging y resolución de problemas en general.\\n\\nTengo experiencia con JWT, bases de datos y buenas prácticas de seguridad. Me adapto rápido y puedo aportar desde el análisis y la implementación.\\n\\nQuedo atento, gracias.', 'https://github.com/axelnz', 'GDX3PFZQURFK3LZ3UREDC52QUI5KOYIGVYARKBCRXOY6NKY64A5PE5N2', 'pending', '2026-05-18 16:24:31'),
(161, 99, 346, 'Tengo más de 6 años de experiencia creando aplicaciones web desde el diseño de la base de datos hasta la interfaz de usuario. He creado sitios webs y sistemas webs para Almacenas, Bibliotecas, Oficinas administrativas, etc. Me considero una persona proactiva y que le gustan los nuevos retos.', 'https://www.linkedin.com/in/enyerber-rangel/', 'GBA3CK2FXZSAUK22WTW7FNFLT5BH7KR5DFH3HBGATH7QIKPBWP7J6DXW', 'pending', '2026-05-19 00:38:45'),
(162, 110, 1, 'wow', 'https://github.com/wrever/', 'GALR6D6JTE2C554HD2OOW5CDMUYBYZ43S4VLWPDAMJFLSF2GQW5GLCT3', 'pending', '2026-05-24 02:40:33'),
(163, 111, 1, 'wow', 'https://github.com', 'GALR6D6JTE2C554HD2OOW5CDMUYBYZ43S4VLWPDAMJFLSF2GQW5GLCT3', 'pending', '2026-05-24 02:47:24');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `disputes`
--

CREATE TABLE `disputes` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `created_by` int(11) NOT NULL COMMENT 'Usuario que crea la disputa (cliente o trabajador)',
  `reason` text NOT NULL COMMENT 'Razón de la disputa',
  `tx_hash` varchar(255) DEFAULT NULL,
  `status` enum('pending','resolved','cancelled') DEFAULT 'pending',
  `resolution` text DEFAULT NULL COMMENT 'Resolución del admin',
  `resolved_by` int(11) DEFAULT NULL COMMENT 'Admin que resuelve la disputa',
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `disputes`
--

INSERT INTO `disputes` (`id`, `task_id`, `created_by`, `reason`, `tx_hash`, `status`, `resolution`, `resolved_by`, `resolved_at`, `created_at`) VALUES
(14, 103, 63, 'testing report', '16902882055992727b0ed5096236710d11a9145a80427a9d4f4bb67cc129fd46', 'pending', NULL, NULL, NULL, '2026-03-20 18:36:29'),
(15, 108, 6, 'wuauajajaja', '2bca99e28ce4ce482ec5347b946a6c716eb760faaf7150d62a0cbad2583905f3', 'pending', NULL, NULL, NULL, '2026-03-21 19:13:13');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `messages`
--

CREATE TABLE `messages` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `sender_id` int(11) NOT NULL,
  `receiver_id` int(11) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `messages`
--

INSERT INTO `messages` (`id`, `task_id`, `sender_id`, `receiver_id`, `message`, `is_read`, `created_at`) VALUES
(15, 103, 63, 1, 'how\'s it going?', 0, '2026-03-20 18:33:25'),
(16, 103, 1, 63, 'Hello', 0, '2026-03-20 18:33:52'),
(19, 103, 1, 63, 'test', 0, '2026-05-06 23:14:38'),
(20, 103, 1, 63, 'tets', 0, '2026-05-06 23:14:42'),
(21, 103, 1, 63, 'test', 0, '2026-05-06 23:14:47'),
(22, 103, 1, 63, 'tes', 0, '2026-05-06 23:15:20'),
(23, 103, 1, 63, 'sss', 0, '2026-05-06 23:21:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `notifications`
--

CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'NULL = notificación global para todos los usuarios',
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('info','warning','success','error') DEFAULT 'info',
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `notifications`
--

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, NULL, 'mantenimiento', 'programado', 'info', 1, '2025-11-21 10:42:04'),
(2, NULL, 'test', 'test', 'info', 1, '2025-11-21 10:42:27'),
(3, NULL, 'sdsd', 'sds', 'info', 1, '2025-11-21 10:50:32'),
(4, NULL, 'test', 'test', 'info', 1, '2025-11-21 10:54:50');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `ratings`
--

CREATE TABLE `ratings` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `rater_id` int(11) NOT NULL,
  `rated_id` int(11) NOT NULL,
  `rating` int(11) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `review` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `ratings`
--

INSERT INTO `ratings` (`id`, `task_id`, `rater_id`, `rated_id`, `rating`, `review`, `created_at`) VALUES
(1, 97, 1, 3, 5, '', '2026-01-17 02:00:35'),
(2, 100, 1, 3, 5, '', '2026-02-17 17:15:04'),
(3, 102, 3, 1, 5, '', '2026-03-01 02:47:30'),
(4, 104, 63, 21, 5, '', '2026-03-20 18:56:06'),
(5, 107, 21, 4, 5, '', '2026-03-21 17:46:45');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `system_config`
--

CREATE TABLE `system_config` (
  `id` int(11) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text NOT NULL,
  `config_type` varchar(20) DEFAULT 'string',
  `description` text DEFAULT NULL,
  `updated_by` int(11) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Volcado de datos para la tabla `system_config`
--

INSERT INTO `system_config` (`id`, `config_key`, `config_value`, `config_type`, `description`, `updated_by`, `updated_at`) VALUES
(1, 'commission_rate', '0.003', 'number', 'Tasa de comisión de la plataforma (0.3%)', NULL, '2025-11-20 21:26:24'),
(2, 'commission_wallet', 'GAX4W7GOFPXW5GQBTGIESMLES5D573ABRLBWOBJ3GL7HOU4WSCQ6PI4Q', 'string', 'Dirección Stellar del wallet de comisiones', NULL, '2025-11-20 21:26:24'),
(3, 'contract_creation_cost', '2.5', 'number', 'Costo en XLM para crear un contrato escrow', NULL, '2025-11-20 21:26:24'),
(4, 'max_tasks_per_day', '5', 'number', 'Máximo de tareas que un usuario puede crear por día', NULL, '2025-11-20 21:26:24'),
(5, 'max_tasks_per_week', '20', 'number', 'Máximo de tareas que un usuario puede crear por semana', NULL, '2025-11-20 21:26:24'),
(6, 'cooldown_hours', '2', 'number', 'Horas de cooldown entre creación de tareas', NULL, '2025-11-20 21:26:24'),
(7, 'transaction_expiration_days', '7', 'number', 'Días de expiración para transacciones pendientes', NULL, '2025-11-20 21:26:24'),
(8, 'platform_fee', '0.005', 'number', 'Comisión de plataforma (0.3% = 0.003)', 1, '2025-12-29 17:11:37'),
(9, 'referral_fee', '0', 'number', 'Comisión por referidos', 1, '2025-12-29 17:11:37'),
(10, 'treasury_address', 'GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5', 'string', 'Dirección del treasury de ArcusX', 1, '2025-12-29 17:11:37'),
(11, 'arbitrator_address', '', 'string', 'Dirección del arbitrador', NULL, '2025-11-21 01:32:53');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tasks`
--

CREATE TABLE `tasks` (
  `id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `subtitle` varchar(255) DEFAULT NULL,
  `description` text NOT NULL,
  `price` decimal(18,8) NOT NULL,
  `currency` varchar(10) NOT NULL,
  `difficulty` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `user_id` int(11) NOT NULL,
  `accepted_applicant_id` int(11) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'open',
  `client_accepted_completion` tinyint(1) DEFAULT 0,
  `worker_accepted_completion` tinyint(1) DEFAULT 0,
  `files` text DEFAULT NULL,
  `escrow_id` varchar(56) DEFAULT NULL COMMENT 'DEPRECATED: Dirección Stellar del escrow (sistema antiguo). Usar soroban_escrow_id para Soroban.',
  `escrow_platform_fee` decimal(10,7) DEFAULT NULL,
  `escrow_trustline_address` varchar(56) DEFAULT NULL,
  `escrow_amount` decimal(18,8) DEFAULT NULL,
  `contract_id` varchar(56) DEFAULT NULL COMMENT 'Contract ID de Soroban (CDPXYLLQTQPPPPL5CY2BYEIEYAHAMZJTOMHXQVBFZ3GUV47BYLRAC2WG)',
  `soroban_escrow_id` bigint(20) UNSIGNED DEFAULT NULL COMMENT 'ID del escrow en el contrato Soroban (u64)',
  `escrow_secret` varchar(255) DEFAULT NULL,
  `pending_transaction_xdr` text DEFAULT NULL,
  `pending_transaction_signer` varchar(20) DEFAULT NULL,
  `escrow_status` varchar(20) DEFAULT NULL,
  `escrow_created_at` datetime DEFAULT NULL,
  `escrow_completed_at` datetime DEFAULT NULL,
  `scheduled_deletion_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `completed_at` datetime DEFAULT NULL,
  `worker_started_at` datetime DEFAULT NULL COMMENT 'Timestamp cuando trabajador marcó que comenzó',
  `cancellation_requested_at` datetime DEFAULT NULL COMMENT 'Timestamp de solicitud de cancelación',
  `cancellation_reason` text DEFAULT NULL COMMENT 'Razón de cancelación',
  `cancellation_allowed` tinyint(1) DEFAULT 1 COMMENT 'Si cancelación está permitida',
  `cancellation_initiated_by` int(11) DEFAULT NULL COMMENT 'ID del usuario que inició cancelación',
  `cancellation_tx_hash` varchar(255) DEFAULT NULL COMMENT 'Hash de transacción de reembolso'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tasks`
--

INSERT INTO `tasks` (`id`, `title`, `subtitle`, `description`, `price`, `currency`, `difficulty`, `category`, `user_id`, `accepted_applicant_id`, `status`, `client_accepted_completion`, `worker_accepted_completion`, `files`, `escrow_id`, `escrow_platform_fee`, `escrow_trustline_address`, `escrow_amount`, `contract_id`, `soroban_escrow_id`, `escrow_secret`, `pending_transaction_xdr`, `pending_transaction_signer`, `escrow_status`, `escrow_created_at`, `escrow_completed_at`, `scheduled_deletion_at`, `created_at`, `completed_at`, `worker_started_at`, `cancellation_requested_at`, `cancellation_reason`, `cancellation_allowed`, `cancellation_initiated_by`, `cancellation_tx_hash`) VALUES
(97, 'c', 'c', 'c', 1.00000000, 'USDC', 'FÃ¡cil', 'Desarrollo', 1, 3, 'completed', 1, 0, NULL, 'CA4U7LDHC3BMNKZJV55OVZXYMRJLGG75W4IDHWUWBNOPCUNRPG3R3JFY', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 1.00502510, NULL, NULL, NULL, NULL, NULL, 'completed', '2026-01-17 01:58:15', '2026-01-17 02:00:55', '2026-01-18 02:00:55', '2026-01-17 01:56:47', '2026-01-17 02:00:55', NULL, NULL, NULL, 1, NULL, NULL),
(98, 'diseñador grafico', 'sin experiencia requerida', 'Se busca diseñador grafico para empresa web3', 15.00000000, 'USDC', 'Fácil ', 'Desarrollo', 1, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-17 02:06:11', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(99, 'desarrollo aplicativo', 'Con experiencia requerida previamente', 'Se necesita desarrollador backend', 300.00000000, 'USDC', 'Difícil ', 'Desarrollo', 4, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-01-24 02:05:46', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(100, 'desarrollo web', 'crear website completa', 'test', 0.20000000, 'USDC', 'Intermedio', 'Desarrollo', 1, 3, 'completed', 1, 0, NULL, 'CCQIU4NEK5A3Q4NTDDIWPT3HR5LRQECDCNMW5LVHZ3B2JYH5HYAHOHKO', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 0.20100500, NULL, NULL, NULL, NULL, NULL, 'completed', '2026-02-17 17:14:28', '2026-02-17 17:15:52', '2026-02-18 17:15:52', '2026-02-17 17:09:47', '2026-02-17 17:15:52', NULL, NULL, NULL, 1, NULL, NULL),
(101, 'Practicante web3', 'practicante con/sin experiencia en programaciÃ³n ', 'se busca a un practicante, ojala con experiencia en el ambito web3 para plataforma', 20.00000000, 'USDC', 'Intermedio', 'Desarrollo', 1, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-20 04:55:52', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(102, 'Desarrollador web3', 'Se busca desarrollador web3 para ArcusX', 'Necesitamos que realice una nueva habilitacion de wallet en la plataforma donde se dara un nuevo acceso para recibir pagos en la plataforma ArcusX', 30.00000000, 'USDC', 'Intermedio', 'Desarrollo', 3, 1, 'assigned', 0, 0, NULL, 'CDVKIMWMFOJ7T4SNVPLYHIW26AA6BQOQW6SOT3BTM4KFDBMGFHPAMWZB', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 30.15075380, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-01 02:41:54', NULL, NULL, '2026-03-01 01:51:06', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(103, 'Write questions in Spanish for a hackathon survey', 'looking for someone technical', 'I want someone to write a set of 10 questions in Spanish to get feedback from Stellar developers at the CDMX hackathon. I want the questions to be focused around developer experience and tooling that Stellar provides for developers.', 0.50000000, 'USDC', 'Fácil', 'Contenido', 63, 1, 'disputed', 0, 0, '[{\"id\":\"69bd9338c3ed2\",\"name\":\"Screenshot 2026-03-20 at 12.34.19\\u202fPM.png\",\"filename\":\"Screenshot 2026-03-20 at 12.34.19\\u202fPM_1774031672_69bd9338c382f.png\",\"size\":533129,\"type\":\"image\\/png\",\"uploaded_at\":\"2026-03-20 18:34:32\",\"uploaded_by\":\"user\",\"url\":\"https:\\/\\/arcusx.pro\\/files\\/Screenshot 2026-03-20 at 12.34.19\\u202fPM_1774031672_69bd9338c382f.png\"}]', 'CAFZGUPM3TLXCGSFOKZIJFLOKYZY4L6635JC7AC2GQ7N645GWOBWDXOX', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 0.50251260, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-20 18:33:09', NULL, NULL, '2026-03-20 16:41:57', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(104, 'Create a logo for my business', '', 'I would like something circular that I can use for my website. Looking for my initials \\\"SO\\\" in a circle with a nice font.', 5.00000000, 'USDC', 'Fácil', 'Diseño', 63, 21, 'completed', 1, 0, NULL, 'CA5W73WQ6E326657WCOGNGI7DOZSKZ7JPCEC7DRDILUHF53FA7IN4YGW', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 5.02512560, NULL, NULL, NULL, NULL, NULL, 'completed', '2026-03-20 18:55:30', '2026-03-20 18:56:21', '2026-03-21 18:56:21', '2026-03-20 18:52:47', '2026-03-20 18:56:21', NULL, NULL, NULL, 1, NULL, NULL),
(105, 'Desarrollo Test', 'Testnet', 'Desarrollar app test', 0.10000000, 'USDC', 'Fácil', 'Desarrollo', 4, NULL, 'open', 0, 0, NULL, 'CBE2624566PC42WYNXJEJNY4GLUSZ5VQFWOJWY2RCD4C4NBC4Y73YIJX', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 0.10050250, NULL, NULL, NULL, NULL, NULL, 'pending_funding', '2026-03-20 18:58:31', NULL, NULL, '2026-03-20 18:54:56', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(106, 'Marketing Campaign Creation', 'Campaign for a software platform focused on stellar', 'we are looking for you, if you have experience... you\'re welcome!', 5.00000000, 'USDC', 'Fácil', 'Desarrollo', 1, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-21 17:41:12', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(107, 'SDFDSF', 'DSFDS', 'DSFSD', 2.00000000, 'USDC', 'Fácil', 'Desarrollo', 21, 4, 'completed', 1, 1, '[{\"id\":\"69bed95b6f6ef\",\"name\":\"voucher-MEX.pdf\",\"filename\":\"voucher-MEX_1774115163_69bed95b6f009.pdf\",\"size\":672482,\"type\":\"application\\/pdf\",\"uploaded_at\":\"2026-03-21 17:46:03\",\"uploaded_by\":\"user\",\"url\":\"https:\\/\\/arcusx.pro\\/files\\/voucher-MEX_1774115163_69bed95b6f009.pdf\"}]', 'CBDYXUJSFM23LNHTSJ6CYBT5H2WFOPT5WU3PIHNMKJRIYXESTH2BD7P5', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 2.01005030, NULL, NULL, NULL, NULL, NULL, 'completed', '2026-03-21 17:45:25', '2026-03-21 17:47:10', '2026-03-22 17:47:10', '2026-03-21 17:44:24', '2026-03-21 17:47:10', NULL, NULL, NULL, 1, NULL, NULL),
(108, 'xsfsddsf', 'sdfsdsdf', 'sdfsfdsdf', 1.00000000, 'USDC', 'Fácil', 'Desarrollo', 6, 21, 'disputed', 0, 0, NULL, 'CAJFGYBSAM7C7ZBNQCAOU7BOW2MERUPKTPSNV7SAERLRNLRNNAQBY3UE', 0.0050000, 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', 1.00502510, NULL, NULL, NULL, NULL, NULL, 'active', '2026-03-21 19:12:27', NULL, NULL, '2026-03-21 19:10:53', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(110, 'Diseño de logo', 'diseño para empresa SozuPay', 'logo bonito.', 2000.00000000, 'USDC', 'Intermedio', 'Desarrollo', 83, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-04-18 01:43:21', NULL, NULL, NULL, NULL, 1, NULL, NULL),
(111, 'titulo de la tarea', 'subtutilode la terea', 'Descripion de la teara', 500.00000000, 'USDC', 'Intermedio', 'Desarrollo', 213, NULL, 'open', 0, 0, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-05-07 17:28:57', NULL, NULL, NULL, NULL, 1, NULL, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `task_progress`
--

CREATE TABLE `task_progress` (
  `id` int(11) NOT NULL,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `progress_type` enum('started','delivery','message','milestone','cancellation_requested','cancellation_approved','cancellation_rejected') NOT NULL,
  `description` text DEFAULT NULL,
  `files` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`files`)),
  `metadata` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`metadata`)),
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `avatar_url` varchar(500) DEFAULT NULL,
  `bio` text DEFAULT NULL,
  `portfolio_url` varchar(500) DEFAULT NULL,
  `verified` tinyint(1) DEFAULT 0,
  `public_profile` tinyint(1) DEFAULT 1,
  `created_at_profile` timestamp NULL DEFAULT NULL,
  `role` varchar(20) DEFAULT 'user',
  `is_admin` tinyint(1) DEFAULT 0,
  `password` varchar(255) NOT NULL,
  `wallet_address` varchar(255) DEFAULT NULL,
  `human_id_verified` tinyint(1) DEFAULT 0,
  `human_id_hash` varchar(255) DEFAULT NULL,
  `human_id_verified_at` datetime DEFAULT NULL,
  `human_id_action_id` varchar(255) DEFAULT NULL,
  `supabase_user_id` varchar(255) DEFAULT NULL,
  `completed_tasks_count` int(11) DEFAULT 0,
  `tasks_today` int(11) DEFAULT 0,
  `tasks_this_week` int(11) DEFAULT 0,
  `last_task_created` datetime DEFAULT NULL,
  `cooldown_until` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `average_rating` decimal(3,2) DEFAULT 0.00,
  `total_ratings` int(11) DEFAULT 0,
  `skills` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `avatar_url`, `bio`, `portfolio_url`, `verified`, `public_profile`, `created_at_profile`, `role`, `is_admin`, `password`, `wallet_address`, `human_id_verified`, `human_id_hash`, `human_id_verified_at`, `human_id_action_id`, `supabase_user_id`, `completed_tasks_count`, `tasks_today`, `tasks_this_week`, `last_task_created`, `cooldown_until`, `created_at`, `updated_at`, `average_rating`, `total_ratings`, `skills`) VALUES
(1, 'Admin', 'brunoandres205@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'admin', 1, '$2y$10$619kHKYInlOV9JGywwL63.HCJ1zvArHMzFqPC9IVYGAvy.4nKAkdy', 'GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5', 0, NULL, NULL, NULL, 'aaba565c-cbda-4c43-855d-9916395e57c8', 0, 32, 32, '2026-03-21 17:41:12', NULL, '2025-11-17 13:15:04', '2026-05-28 02:07:42', 5.00, 1, NULL),
(3, 'Bruno Miranda E.', 'brunomirandaes10@gmail.com', '/files/avatars/3_1767922361_69605ab98b56b.jpg', 'Founder & CEO | ArcusX | \n\nSoy un programador fullstack y estudiante de ingenierÃ­a en informÃ¡tica, apasionado por la bÃºsqueda de un mejor futuro para todos con Stellar', 'https://github.com/wrever/', 0, 1, NULL, 'user', 0, '', 'GBXBJSGUDCUXED5FTRO63XIVYYWY4QVEIK6R2UGZ4SFGCJGUJA6HWE5H', 0, NULL, NULL, NULL, '32750660-b498-4200-a089-7975d80e8e3b', 61, 1, 1, '2026-03-01 01:51:06', '2026-03-01 03:51:06', '2025-11-17 13:29:10', '2026-03-01 01:51:06', 5.00, 2, '[{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"C++\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"HTML\",\"level\":\"advanced\"}]'),
(4, 'Toph', 'cris.escobar18144@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'admin', 1, '$2y$10$SovhbJNKYr8aHUbY05o0Cex2MLi691qDGvvuEn7KXA7QSbqRmQ.Dy', NULL, 0, NULL, NULL, NULL, '758e4641-1e77-401e-863d-b88a28a2e35c', 1, 3, 3, '2026-03-20 18:54:56', '2026-03-20 20:54:56', '2025-12-11 18:46:39', '2026-03-21 23:50:11', 5.00, 1, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"PHP\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"}]'),
(5, 'Sheibegdu2', 'roque.cea.0407@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'aa5a8324-9f8b-4df6-b0d0-7f9aae934835', 0, 0, 0, NULL, NULL, '2025-12-28 02:53:07', '2025-12-28 02:53:54', 0.00, 0, NULL),
(6, 'crais', 'cris.escobar25144@gmail.com', NULL, 'Ingeniero en redes y telecomunicaciones, exoeriencia como ingeniero en sistemas en Penta', NULL, 0, 1, NULL, 'user', 0, '$2y$10$l0GKMJ2hlhflt6raJqLyd.H/T5TL5ZVnrw3B//8haSle36PpxkryC', NULL, 0, NULL, NULL, NULL, NULL, 0, 2, 2, '2026-03-21 22:10:55', '2026-03-22 00:10:55', '2026-01-01 20:02:45', '2026-05-12 19:35:15', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"Angular\",\"level\":\"beginner\"},{\"name\":\"Redis\",\"level\":\"beginner\"}]'),
(7, 'Roque Cea', 'roque.cea.777@gmail.com', '/files/avatars/7_1768617258_696af52a3c877.png', 'Estudiante de ingenieria en informatica cursando el tercer aÃ±o en UTEM\n20 años, programando desde los 17 años', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '18f35e82-f94e-4cee-b770-5250a6634b12', 0, 0, 0, NULL, NULL, '2026-01-02 01:58:54', '2026-05-12 23:18:26', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Blockchain\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"beginner\"}]'),
(8, 'marcosreyesm', 'marcos.reyes.m@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '730317f2-6b5d-4176-9fac-2dc29ad0fca9', 0, 0, 0, NULL, NULL, '2026-01-02 01:59:15', '2026-02-28 18:08:36', 0.00, 0, NULL),
(9, 'pau', 'kohcuendepau@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c52ffdfb-828f-4000-b3c6-d76fdbe7c115', 0, 0, 0, NULL, NULL, '2026-01-02 02:01:21', '2026-02-28 18:08:30', 0.00, 0, NULL),
(10, 'delfinacorradini', 'delfinacorradini073@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5b4fb6d0-5e3d-4dc7-9b17-cb77f999a0af', 0, 0, 0, NULL, NULL, '2026-01-02 02:07:39', '2026-02-28 18:08:25', 0.00, 0, NULL),
(11, 'jorgeoehrens', 'jorge.oehrens@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fd4529eb-b4d4-4126-b5b0-e0c0c2bebce0', 0, 0, 0, NULL, NULL, '2026-01-02 02:21:17', '2026-02-28 18:08:19', 0.00, 0, NULL),
(12, 'Rashid ', 'raferey87@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$VGNBFKACgR/O0iE31jh/CuTvKd42h4hm9.N7bAy6y5ufQRwclba6K', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-01-02 02:40:43', '2026-01-02 02:40:43', 0.00, 0, NULL),
(13, 'joaquinfarfan', 'jfarfantorres@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '25c58e5d-bc23-4e37-862e-cf5d83d49504', 0, 0, 0, NULL, NULL, '2026-01-02 13:31:31', '2026-02-28 18:08:13', 0.00, 0, NULL),
(14, 'cristianguzman', 'cr1st1an.xxiko@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3cfc0921-acbe-4efe-98f0-9e79f1f4a491', 0, 0, 0, NULL, NULL, '2026-01-02 14:32:45', '2026-02-28 18:08:08', 0.00, 0, NULL),
(15, 'NOUS Creative Lab', 'contacto.isak92@gmail.com', NULL, 'Soy publicista y creador audiovisual freelance. Desarrollo piezas de video, fotografí­a y contenido visual para marcas y proyectos que necesitan comunicar lo nuevo con claridad, especialmente en entornos digitales y tecnológicos.', 'https://www.instagram.com/nous.creativelab', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '4af2b1f6-d3b3-4810-9a52-3f9989956f4b', 0, 0, 0, NULL, NULL, '2026-01-02 17:20:52', '2026-05-12 23:19:00', 0.00, 0, NULL),
(16, 'mirra', 'mirrag.0999@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd5ab09f2-b2d2-406d-bb38-6495936bbeec', 0, 0, 0, NULL, NULL, '2026-01-04 20:13:44', '2026-02-28 18:06:57', 0.00, 0, NULL),
(17, 'Villarley', 'santivillarley1010@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '14ddec25-2b83-4234-a2d4-2b0b83aadc9c', 0, 0, 0, NULL, NULL, '2026-01-04 20:20:00', '2026-01-04 20:21:12', 0.00, 0, NULL),
(18, 'joelvargas', 'vermudo.com@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '4ff95a9d-4e55-414d-9d70-34340c5ddec3', 0, 0, 0, NULL, NULL, '2026-01-04 20:20:17', '2026-02-28 18:06:51', 0.00, 0, NULL),
(19, 'ricardovallejosnchez', 'vallejoricardo3@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fb9f85d6-332f-4692-9c31-518ebc2f190e', 0, 0, 0, NULL, NULL, '2026-01-04 20:25:20', '2026-02-28 18:06:44', 0.00, 0, NULL),
(20, 'Chanchito', '4chanchi@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0cce3459-63ea-470b-a400-7f595ffae90e', 0, 1, 1, '2026-01-04 20:57:51', '2026-01-04 22:57:51', '2026-01-04 20:55:13', '2026-01-04 21:03:51', 0.00, 0, NULL),
(21, 'pablo valenzuela', 'pablovalen205@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$NJhWWWRYdlMdQxQ17dxvi.Ti.H0uYOHbsC9PmhujmQKKe67BBmwRS', NULL, 0, NULL, NULL, NULL, 'c73ff160-9adc-4851-8f30-76659544ee71', 2, 1, 1, '2026-03-21 17:44:24', NULL, '2026-01-04 22:06:28', '2026-05-12 04:47:32', 5.00, 1, NULL),
(22, 'gustavogaray', 'gustavo.garay2005@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '65d32e4b-3fba-45b2-bd18-15ab2333810c', 0, 0, 0, NULL, NULL, '2026-01-05 09:31:41', '2026-02-28 18:06:37', 0.00, 0, NULL),
(23, 'jeremiasmeneses', 'jerexmeneses3@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0a54c055-a90d-4557-b858-d642c11c9b6e', 0, 0, 0, NULL, NULL, '2026-01-06 02:37:05', '2026-02-28 18:06:29', 0.00, 0, NULL),
(24, 'fade', 'fade.try.fade.t@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9614b23e-a3cd-48b3-8523-97e311cdd272', 0, 0, 0, NULL, NULL, '2026-01-06 03:44:18', '2026-02-28 18:06:23', 0.00, 0, NULL),
(25, 'martinsegura', 'martin.segura1728@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'bef06004-6274-45b0-8126-d5642514ef54', 0, 0, 0, NULL, NULL, '2026-01-06 20:56:59', '2026-02-28 18:06:13', 0.00, 0, NULL),
(26, 'davidchaura', 'davidchauranda@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd23855c6-7ec3-42e3-95d7-b2dcfeb9797d', 0, 0, 0, NULL, NULL, '2026-01-07 23:34:32', '2026-02-28 18:06:07', 0.00, 0, NULL),
(27, 'luisrodriguez', 'luisrodriguezweb3@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '252b857f-c20b-429e-a58d-53b9cd86a5ec', 0, 0, 0, NULL, NULL, '2026-01-08 02:57:17', '2026-05-07 01:16:30', 0.00, 0, NULL),
(28, 'paukoh', 'pau@telluscoop.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '35db328b-4fab-4297-bd65-c46b00f81055', 0, 0, 0, NULL, NULL, '2026-01-10 02:03:05', '2026-05-07 01:16:27', 0.00, 0, NULL),
(29, 'pabloortiz', 'pablo.caro.pj@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '67213513-deff-4852-9bc7-434c936ef8df', 0, 0, 0, NULL, NULL, '2026-01-10 02:49:04', '2026-05-07 01:16:23', 0.00, 0, NULL),
(30, 'alejandropeaa', 'alejandroarpa@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e98288b2-a70e-4a51-baaa-3f1f57657949', 0, 0, 0, NULL, NULL, '2026-01-10 22:36:55', '2026-05-07 01:16:19', 0.00, 0, NULL),
(31, 'dusanrodriguez', 'dusan.rodriguez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '068d8816-8ada-42f7-bf22-0694b98c6d62', 0, 0, 0, NULL, NULL, '2026-01-11 04:06:12', '2026-05-07 01:16:15', 0.00, 0, NULL),
(32, 'karenfloresbarrientos', 'kfb.nnii@gmail.com', '/files/avatars/32_1768263512_69658f5820ae2.jpg', NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a797567d-24e7-4b59-9f3a-75349af81fb0', 0, 0, 0, NULL, NULL, '2026-01-13 00:15:24', '2026-03-12 00:22:52', 0.00, 0, NULL),
(33, 'pabloguzman', 'pablo.guzman.sanchez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '73a4add2-565b-462c-8680-c9a928e188a8', 0, 0, 0, NULL, NULL, '2026-01-16 14:21:31', '2026-05-07 01:16:10', 0.00, 0, NULL),
(34, 'Dione Bastos', 'dione.bash.dev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$J7YQ3J1b/ypo03aLPswwbOgk2varTXahZ7Z3FSPB9ZtczXLK5n6T6', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-01-19 15:27:45', '2026-01-19 15:27:45', 0.00, 0, NULL),
(35, 'vicentesoto', 'tsmfandom@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a41df82a-7f60-4054-8a8e-ade564eb97aa', 0, 0, 0, NULL, NULL, '2026-01-29 21:34:42', '2026-05-07 01:16:03', 0.00, 0, NULL),
(36, 'jagadeeshb', 'jagadeesh26062002@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '74740b15-ff9d-4227-945f-ddedd6e6599d', 0, 0, 0, NULL, NULL, '2026-02-03 17:40:36', '2026-05-07 01:15:58', 0.00, 0, NULL),
(37, 'bhernandezba', 'bhernandezba@utem.cl', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fc2059ec-997b-4f0c-a1d0-38a8634ace3f', 0, 0, 0, NULL, NULL, '2026-02-04 03:18:39', '2026-05-07 01:15:54', 0.00, 0, NULL),
(38, 'danguajardo', 'daneliasguajrdo@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3765a09b-97f9-42d6-80c6-f33791194ad1', 0, 0, 0, NULL, NULL, '2026-02-04 03:31:45', '2026-05-07 01:15:51', 0.00, 0, NULL),
(39, 'lucioojeda', 'luciobkt2011@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5d0d47cb-48cc-42d8-b5b2-bfb9854e0dbf', 0, 0, 0, NULL, NULL, '2026-02-04 03:37:38', '2026-05-07 01:15:47', 0.00, 0, NULL),
(40, 'andreeplascencia', 'andreepulga26@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8b0fde2e-9a5b-4352-81dd-1b2c6757e45a', 0, 0, 0, NULL, NULL, '2026-02-04 05:00:36', '2026-05-07 01:15:44', 0.00, 0, NULL),
(41, 'toariasmithy', 'toariasmithy@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '4f88225b-f4c7-46a2-a00b-e70705fcdc2d', 0, 0, 0, NULL, NULL, '2026-02-04 22:01:31', '2026-05-07 01:15:40', 0.00, 0, NULL),
(42, 'moneyshop', 'money.shop.chile@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b5bb6b21-ca34-4d6c-88ac-e9911918054f', 0, 0, 0, NULL, NULL, '2026-02-05 22:02:30', '2026-05-07 01:15:37', 0.00, 0, NULL),
(43, 'Onelove', 'ralvarezpoblete@gmail.com', '/files/avatars/43_1770565021_6988ad9de9f29.png', 'Communities Builder,\nMember @AvaxTeam1,\nCore Team @SoulSocietyAlli\nContributor @ChileDAO, @PlayCryptalia\nCollabs @DarkDao1', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '41227701-be2d-46b5-b1d3-978b4f5fb15a', 0, 0, 0, NULL, NULL, '2026-02-08 15:34:39', '2026-05-12 23:21:12', 0.00, 0, '[{\"name\":\"Web3\",\"level\":\"advanced\"}]'),
(44, 'manuelpz.dev', 'manuelpz.dev@gmail.com', '/files/avatars/44_1770905273_698ddeb96e43b.png', 'Hola !  Aqui Manuel Peña, Ingeniero UC en Web3 desde el 2019, primero como asesor técnico y luego como desarrollador! \n\nMe encanta conocer los fundamentos de cada red y explorar su potencial, comprometido con la privacidad y la descentralización.\n\nFirme creyente en que la web3 debe integrarse en la vida de las personas creando valor y con una UX que la haga imperceptible . No basta con los claims.\n\nExperiencia en Startups (Premio Nacional de Innovación 2021) y en desarrollo web3 en Solidity y Rust \n\nPara mas info, proyectos o hablar de cualquier cosa solo escribeme!', 'https://manuelpenazuniga.github.io', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3484cd90-e36d-41a4-90dd-85d78cf8d078', 0, 0, 0, NULL, NULL, '2026-02-12 14:04:27', '2026-05-12 23:22:06', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Bitcoin\",\"level\":\"advanced\"},{\"name\":\"Smart Contracts\",\"level\":\"advanced\"},{\"name\":\"Blockchain\",\"level\":\"advanced\"},{\"name\":\"Stellar\",\"level\":\"intermediate\"},{\"name\":\"Solidity\",\"level\":\"advanced\"},{\"name\":\"Web3\",\"level\":\"expert\"},{\"name\":\"Ethereum\",\"level\":\"advanced\"},{\"name\":\"AWS\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"Rust\",\"level\":\"intermediate\"},{\"name\":\"Go\",\"level\":\"beginner\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"Photoshop\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"intermediate\"}]'),
(45, 'evelyn_evepy', 'violete1313@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '47924594-1eae-4458-abd4-57d827c6c655', 0, 0, 0, NULL, NULL, '2026-02-12 15:03:49', '2026-02-12 15:05:14', 0.00, 0, '[{\"name\":\"Dart\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"advanced\"}]'),
(47, 'Simon', 'simonmardones095@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$5c25UkCPgFSNjiq5tH9Iie2zbpsYXccxbravXTJfld4kzMIYkCpYS', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-02-21 04:26:01', '2026-02-21 04:26:01', 0.00, 0, NULL),
(49, 'miamaturana', 'mia26928@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '697ed2df-9079-45ff-b556-fd1d83c5a026', 0, 0, 0, NULL, NULL, '2026-02-23 03:21:57', '2026-03-05 23:10:34', 0.00, 0, NULL),
(55, 'usuarioprueba09', 't.sepulvedacaroca@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$cRE0LEOpI2MhVBKku51PM.LUfnnS/IyOFK7C3eomw8CjR/LaZ5xJ6', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-02 22:19:56', '2026-03-02 22:19:56', 0.00, 0, NULL),
(56, 'armandomurillo', 'armando@trustlesswork.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '85690ca4-89ae-4323-bb8e-2c51d94f7663', 0, 0, 0, NULL, NULL, '2026-03-02 23:31:53', '2026-03-05 23:09:53', 0.00, 0, NULL),
(57, 'Jeremias', 'jeremazo30@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$MJjVLyw3YhvFaiRS1hwUZuj0zCIxqftnT7eEw3m/UjsVX31F2ZrS.', NULL, 0, NULL, NULL, NULL, '5d890852-d95f-4a9e-92cc-744cbd68343e', 0, 0, 0, NULL, NULL, '2026-03-12 01:43:45', '2026-03-12 01:44:22', 0.00, 0, NULL),
(58, 'alejandroalvarez', 'a.alejandro.alvarez.a@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'dcf12597-4ae9-44fa-9a22-510758a13eac', 0, 0, 0, NULL, NULL, '2026-03-12 15:43:04', '2026-05-07 01:15:31', 0.00, 0, NULL),
(59, 'andres', 'andresplay0500@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'bb07643b-2d81-4158-8424-677052f8574e', 0, 0, 0, NULL, NULL, '2026-03-13 01:31:11', '2026-05-07 01:15:26', 0.00, 0, NULL),
(60, 'hugoaracena', 'haracena.dev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c7af1dd5-21b2-4c65-80ca-e66b36662a83', 0, 0, 0, NULL, NULL, '2026-03-13 13:00:01', '2026-05-07 01:15:22', 0.00, 0, NULL),
(61, 'collinsikechukwu', 'collinschristroa@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6e7aef11-6a48-42b6-9f8b-d2b44115fa91', 0, 0, 0, NULL, NULL, '2026-03-13 13:55:04', '2026-05-07 01:15:18', 0.00, 0, NULL),
(62, 'sabrinapanelli', 'panellisabrina9@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ff056055-9675-453b-ac02-683fd29ce345', 0, 0, 0, NULL, NULL, '2026-03-15 16:24:38', '2026-05-07 01:15:14', 0.00, 0, NULL),
(63, 'steph', 'so.orpilla@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '005eee78-3833-4ea9-a43f-716f799def9f', 0, 2, 2, '2026-03-20 18:52:47', '2026-03-20 20:52:47', '2026-03-20 16:38:13', '2026-05-07 01:15:08', 0.00, 0, NULL),
(64, 'tylervanderhoeven', 'hi@tyvdh.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '4b246505-e03f-479c-9132-ebfe35067d6f', 0, 0, 0, NULL, NULL, '2026-03-20 21:18:00', '2026-05-07 01:14:54', 0.00, 0, NULL),
(65, 'brunomull', 'brunohmuller@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '91fc8ca1-bc87-44a8-9001-064d7d40d22d', 0, 0, 0, NULL, NULL, '2026-03-20 21:19:10', '2026-05-07 01:15:02', 0.00, 0, NULL),
(66, 'cristophermontenegro', 'cristopher.montenegro.7@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f6cae8d3-1507-4e5d-b664-28c72c4fe0e5', 0, 0, 0, NULL, NULL, '2026-03-21 20:11:59', '2026-05-07 01:14:50', 0.00, 0, NULL),
(67, 'Luchi34', 'luiscarlos.reyesbarrios@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$Gt3cK3oEFpqeFBYE2B7NleGAxQS7S75Uj6zw0zL3iN6W4aIBHQHEu', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-21 20:12:25', '2026-03-21 20:16:43', 0.00, 0, NULL),
(69, 'sebaglvez', 'sebagalvez51@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '25288bb8-7ebf-45da-9564-05dff584b8f8', 0, 0, 0, NULL, NULL, '2026-03-21 20:22:14', '2026-05-07 01:14:44', 0.00, 0, NULL),
(70, 'benjamingalvez', 'benja.galvez.bg.82@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '84892cd7-1483-4d82-bb8b-d778497dd8ae', 0, 0, 0, NULL, NULL, '2026-03-21 20:44:33', '2026-05-07 01:14:40', 0.00, 0, NULL),
(71, 'crice', 'cris.escobar26144@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$W9tvjeAmMbc4eq/1lxOD/Ol8htR9EvRTeimERbB4/n20vjAfQz/pe', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-03-21 21:14:28', '2026-03-21 21:14:28', 0.00, 0, NULL),
(72, 'diegosalgado', 'salgadodiego112@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5b0d6e88-bbe5-4e2f-bcfb-fc8f9eb5d4d6', 0, 0, 0, NULL, NULL, '2026-03-21 21:27:41', '2026-05-07 01:14:35', 0.00, 0, NULL),
(73, 'jairolopezarias', 'jairolopezarias@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e029053b-9f68-4890-9d00-52b4c434bbd4', 0, 0, 0, NULL, NULL, '2026-03-21 21:44:45', '2026-05-07 01:14:30', 0.00, 0, NULL),
(74, 'tomasescobar', 'tsescobar87@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e7388bd7-6f4e-4554-ab6f-a4b6c909590a', 0, 0, 0, NULL, NULL, '2026-03-23 16:58:15', '2026-05-07 01:14:26', 0.00, 0, NULL),
(75, 'faboxcl1', 'fabosaurio630@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '580811fe-5c9c-4b7d-925f-2bc33d071dcb', 0, 0, 0, NULL, NULL, '2026-03-28 20:13:52', '2026-05-07 01:14:21', 0.00, 0, NULL),
(76, 'Ignacio Rodríguez Ávila', 'parejadescentralizada@gmail.com', NULL, 'Soy estratega de marketing digital enfocado en crecimiento, adquisición de usuarios y comunicación de productos digitales, especialmente en entornos web3.\n\nMe especializo en transformar ideas complejas en mensajes simples que conectan y convierten. Trabajo con herramientas de IA para crear contenido, campañas y sistemas de marketing de forma rápida y eficiente.\n\nHe participado en la creación de embudos, contenido viral, automatizaciones y estrategias de captación para proyectos digitales, combinando creatividad con enfoque en resultados.\n\nBusco colaborar en proyectos donde pueda aportar ejecución, claridad estratégica y velocidad.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9bb2e3e5-b70b-45d1-941b-1f48316fce39', 0, 0, 0, NULL, NULL, '2026-03-30 03:04:25', '2026-03-30 03:14:59', 0.00, 0, '[{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"Blockchain\",\"level\":\"intermediate\"},{\"name\":\"Web3\",\"level\":\"intermediate\"},{\"name\":\"Stellar\",\"level\":\"beginner\"}]'),
(77, 'atiliocalderonmorales', 'atilioacm@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c0468d2c-2193-43bd-bb2d-a6a8cdb34bb0', 0, 0, 0, NULL, NULL, '2026-03-30 12:16:31', '2026-05-07 01:14:16', 0.00, 0, NULL),
(78, 'Thezanerixum', 'pepegodoygutierrez@gmail.com', '/files/avatars/78_1774919986_69cb2132d44d6.png', NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'eff6ad93-f41b-4368-9c81-c4deafc0a2a7', 0, 0, 0, NULL, NULL, '2026-03-31 01:08:21', '2026-03-31 01:19:55', 0.00, 0, '[{\"name\":\"Linux\",\"level\":\"beginner\"},{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"Photoshop\",\"level\":\"beginner\"}]'),
(79, 'francisdim', 'dimfrancis6@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '822c397d-94eb-4a2f-996f-c40609766e9f', 0, 0, 0, NULL, NULL, '2026-04-02 05:46:36', '2026-05-07 01:14:09', 0.00, 0, NULL),
(80, 'mirkovera', 'veramirko20@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'abce8ed8-4dad-4851-9b0a-7e07c24cf46a', 0, 0, 0, NULL, NULL, '2026-04-12 00:56:52', '2026-05-07 01:14:04', 0.00, 0, NULL),
(81, 'dano', 'dcontrerasl@live.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '82108e0b-416e-4e71-9016-024240102ec4', 0, 0, 0, NULL, NULL, '2026-04-12 16:07:11', '2026-05-07 01:14:00', 0.00, 0, NULL),
(82, 'jamesbachini', 'jimbachini@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '99db3f85-9f83-4800-9f05-8ecea125b51b', 0, 0, 0, NULL, NULL, '2026-04-16 07:43:47', '2026-05-07 01:13:55', 0.00, 0, NULL),
(83, 'mentemaestra', 'inboxmentemaestra@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '19bc362d-4b00-4ba1-9d66-79547dee3b51', 0, 1, 1, '2026-04-18 01:43:21', '2026-04-18 03:43:21', '2026-04-18 01:40:19', '2026-05-07 01:13:48', 0.00, 0, NULL),
(84, '_melaniepv', 'melanieparrav@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$pGA1s2GYXPHMAgR81o0RYeSZQohIDN0Qt/VwpUo9cly7cztpyNKgy', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-04-29 01:50:51', '2026-04-29 01:50:51', 0.00, 0, NULL),
(85, 'Ansllxs', 'angie02alpizar@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$.6tBZ1kTg0Ormyoat8IcvOwsgNByHbfQImYTtneppBHZl/N5H5qHy', NULL, 0, NULL, NULL, NULL, '5ebeecba-5588-4fbb-a67c-146462d6a309', 0, 0, 0, NULL, NULL, '2026-04-29 21:36:44', '2026-05-17 22:44:19', 0.00, 0, NULL),
(86, 'JrHk112', 'joserafaelhernandezq.a@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$IsD8o2I6z3MsyuBfk9fC7Od8pUIb2Ea2B6g/mHhkEy0A2LAZVHvoi', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-01 03:12:33', '2026-05-01 03:12:33', 0.00, 0, NULL),
(87, 'gab', 'gabo2692005@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$MJ42r0Qau.S058FZXzMDzueD9KvzkaT8.aqCHxkoUA7Q89U7yJGlC', NULL, 0, NULL, NULL, NULL, '7de957ee-4e28-4f0b-9244-ad7e00a13b96', 0, 0, 0, NULL, NULL, '2026-05-01 06:15:08', '2026-05-13 13:15:33', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"C#\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"expert\"},{\"name\":\"Laravel\",\"level\":\"advanced\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"HTML\",\"level\":\"expert\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Vue.js\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"MongoDB\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"AWS\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"advanced\"},{\"name\":\"Photoshop\",\"level\":\"advanced\"},{\"name\":\"Illustrator\",\"level\":\"beginner\"},{\"name\":\"Express\",\"level\":\"intermediate\"}]'),
(88, 'josemorillo', 'josemorillo702@gmail.com', '/files/avatars/88_1777622898_69f45f72b60ac.jpg', 'Soy desarrollador full-stack e ingeniero de automatización con IA, disponible de forma remota. Soy autodidacta y estoy certificado por 4Geeks Academy. Lo que sé lo aprendí construyendo cosas reales, no aprobando exámenes. Trabajo de forma bilingüe en español (nativo) e inglés (C2)', 'https://portfolio-chi-opal-jsilwwaco7.vercel.app/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ff230bd7-6a39-4f4b-ba12-b2caefca2d45', 0, 0, 0, NULL, NULL, '2026-05-01 08:06:48', '2026-05-01 08:11:35', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"Flask\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"REST API\",\"level\":\"beginner\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"}]'),
(89, 'adonisdaller', 'traiderdaller2599@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b24eeb51-ae09-4450-81a5-685c06742fe7', 0, 0, 0, NULL, NULL, '2026-05-01 13:09:15', '2026-05-07 01:13:43', 0.00, 0, NULL),
(90, 'Saba', 'sabatiko02@gmail.com', '/files/avatars/90_1777646298_69f4bada80444.png', 'Full-stack developer with experience building web applications using Java (Spring Boot) and modern JavaScript frameworks like React and Next.js. Focused on backend development, API design, and database management, with a strong interest in creating efficient and scalable solutions.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd63e7173-136b-430d-b53e-44495ee652eb', 0, 0, 0, NULL, NULL, '2026-05-01 14:33:03', '2026-05-01 14:38:31', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"C#\",\"level\":\"intermediate\"},{\"name\":\"Spring\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Express\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"SCSS\",\"level\":\"advanced\"},{\"name\":\"Vue.js\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"advanced\"},{\"name\":\"Angular\",\"level\":\"intermediate\"},{\"name\":\"MongoDB\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"}]'),
(91, '_melaniepv', 'melapava84@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$P0qqq0MhnEv7jnesf1lr6.QSVEQQ5W0mqm7xWTe0WAI6MgtEMxDY.', NULL, 0, NULL, NULL, NULL, '3aa90c1b-262a-4ed6-9c73-6d2adc31de40', 0, 0, 0, NULL, NULL, '2026-05-01 15:54:45', '2026-05-15 09:55:06', 0.00, 0, NULL),
(92, 'lizluanalpezpalacios', 'lizpalacios979@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1ed2dc1b-5ebb-461c-857a-f38268a3be0a', 0, 0, 0, NULL, NULL, '2026-05-01 19:48:58', '2026-05-07 01:13:38', 0.00, 0, NULL),
(93, 'misaelscarbay', 'misaelscarbay@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9b72b5b1-964e-4476-8222-ca47e15bc9d2', 0, 0, 0, NULL, NULL, '2026-05-01 19:59:53', '2026-05-07 01:13:34', 0.00, 0, NULL),
(94, 'josmanuel', 'josemanuel180601@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '55169a60-0000-451a-966e-75a6bcef9c26', 0, 0, 0, NULL, NULL, '2026-05-01 20:43:22', '2026-05-07 01:13:28', 0.00, 0, NULL),
(95, 'alanfeerliboriusgonzalez', 'alanfeerliboriu@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'df41d222-12ae-4091-b5cc-6e719eb99f17', 0, 0, 0, NULL, NULL, '2026-05-01 20:48:48', '2026-05-07 01:13:23', 0.00, 0, NULL),
(96, 'gabrielochoa', 'ochoaga060104@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b64b9d30-482b-49e5-8bd1-8831c8736499', 0, 0, 0, NULL, NULL, '2026-05-02 00:13:10', '2026-05-07 01:13:18', 0.00, 0, NULL),
(97, 'jorgeandres14190', 'jorgeandres14190@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9a6e16a4-f0f8-4df2-9be6-449adf4fe88a', 0, 0, 0, NULL, NULL, '2026-05-02 00:41:24', '2026-05-07 01:13:14', 0.00, 0, NULL),
(98, 'nyxpaez', 'nyxmargotpaez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8db11446-092f-40f4-b06b-a80ad1ee2f4a', 0, 0, 0, NULL, NULL, '2026-05-02 03:47:29', '2026-05-07 01:13:06', 0.00, 0, NULL),
(99, 'sofafernndez', 'info@tulipans.uy', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7fc03cb4-1940-49ee-be2d-d68cdc80bffb', 0, 0, 0, NULL, NULL, '2026-05-02 04:43:20', '2026-05-07 01:13:02', 0.00, 0, NULL),
(100, 'josevilchez', 'josegabrielvilchezc@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5d15aab3-bf1e-4750-83ac-7f58aff03ca0', 0, 0, 0, NULL, NULL, '2026-05-02 05:18:16', '2026-05-07 01:12:57', 0.00, 0, NULL),
(101, 'santiagosalas', 'salassantiagosk8@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '13a96d2d-6ec6-4b2a-ab44-ceea30ea2859', 0, 0, 0, NULL, NULL, '2026-05-02 05:44:58', '2026-05-07 01:12:52', 0.00, 0, NULL),
(102, 'johannprimera', 'jjprimera06@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd5c016b3-d339-46d2-b8e2-76cb8e9c8d8b', 0, 0, 0, NULL, NULL, '2026-05-02 12:52:51', '2026-05-07 01:12:48', 0.00, 0, NULL),
(103, 'yeissoncolmenarez', 'yeissoncolmenarez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '36d7141d-611d-4c77-99c1-18ea552ab14a', 0, 0, 0, NULL, NULL, '2026-05-02 14:02:00', '2026-05-07 01:12:44', 0.00, 0, NULL),
(104, 'gabrielamarilla', 'gaperalta.dev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'dac76067-cddb-46d7-b6ad-4ef8c3539a3d', 0, 0, 0, NULL, NULL, '2026-05-02 14:02:13', '2026-05-07 01:12:39', 0.00, 0, NULL),
(105, 'alejandrogiler', 'alejandrogiler18@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'afc385e7-10ef-4056-9d6e-412947e2a389', 0, 0, 0, NULL, NULL, '2026-05-02 15:18:23', '2026-05-07 01:12:36', 0.00, 0, NULL),
(106, 'Kerwin Quintero ', 'kerwin27120201@gmail.com', NULL, 'Soy desarrollador de software y especialista en automatización de operaciones, con un enfoque centrado en la creación de soluciones tecnológicas que optimicen la eficiencia organizacional. Mi experiencia integra el desarrollo de robustas arquitecturas backend (PHP/Laravel, Python/Flask) y frontend (React, Tailwind), con la implementación de flujos de trabajo inteligentes mediante herramientas como n8n, Zapier y Zoho.\n\nA lo largo de mi trayectoria, he liderado proyectos críticos de infraestructura digital, desde la migración y reestructuración de ecosistemas en la nube hasta el desarrollo de plataformas educativas colaborativas. Mi metodología combina el rigor del pensamiento lógico-matemático con una mentalidad ágil, orientada a transformar requerimientos complejos en herramientas escalables y funcionales.\n\nApasionado por la mejora continua y la honestidad intelectual, busco constantemente desafiar los límites técnicos para aportar valor real, precisión y claridad en cada', 'https://github.com/Kerwin2712', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3909eacb-45ce-470f-ab53-295e677fd5f3', 0, 0, 0, NULL, NULL, '2026-05-02 17:53:34', '2026-05-02 18:36:10', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"expert\"},{\"name\":\"Flask\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Laravel\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"expert\"},{\"name\":\"Docker\",\"level\":\"advanced\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"}]'),
(107, 'belenanton', 'belenaldanaok@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1b2a1703-d368-434b-be47-2c84ad86d25d', 0, 0, 0, NULL, NULL, '2026-05-02 18:09:27', '2026-05-07 01:12:30', 0.00, 0, NULL),
(108, 'brajhansandroarruetaabrigo', 'scze.brajhansandro.arrueta.ab@unifranz.edu.bo', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6468b5bd-7f36-4311-87e2-7d4f837ca4dc', 0, 0, 0, NULL, NULL, '2026-05-02 21:18:12', '2026-05-07 01:12:17', 0.00, 0, NULL),
(109, 'derianriverablas', 'driverab0902@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e50613de-d9c6-426d-a971-e2e808a3eed5', 0, 0, 0, NULL, NULL, '2026-05-02 22:33:47', '2026-05-07 01:12:13', 0.00, 0, NULL),
(110, 'raulfabersani', 'fabersaniraul@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '31008b37-13ac-42d9-a141-2dd559064745', 0, 0, 0, NULL, NULL, '2026-05-03 01:51:55', '2026-05-07 01:12:10', 0.00, 0, NULL),
(111, 'micaeladescotte', 'descottemicaela@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e9570073-f98e-47a4-9808-c6b61dbd6173', 0, 0, 0, NULL, NULL, '2026-05-03 13:26:22', '2026-05-07 01:12:05', 0.00, 0, NULL),
(112, 'alexweb', 'alexxwebb18@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '677345eb-a28c-4cff-acb9-de199bdf926b', 0, 0, 0, NULL, NULL, '2026-05-03 19:25:32', '2026-05-07 01:12:01', 0.00, 0, NULL),
(113, 'albers', 'albers@haltugo.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '69ab4f3a-3bc5-46c4-8a3e-70fbddb01e87', 0, 0, 0, NULL, NULL, '2026-05-03 20:41:31', '2026-05-07 01:11:57', 0.00, 0, NULL),
(114, 'josuesegura', 'admin@p3rcha.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8617cc48-d3f8-477a-8b1f-6446d064a1a8', 0, 0, 0, NULL, NULL, '2026-05-03 22:06:06', '2026-05-07 01:11:50', 0.00, 0, NULL),
(115, 'alberthsullcachvez', 'sullcaalberth@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a1b00251-d809-4328-a9af-900020666579', 0, 0, 0, NULL, NULL, '2026-05-03 23:11:34', '2026-05-07 01:11:43', 0.00, 0, NULL),
(116, 'Val', 'vortmon@gmail.com', '/files/avatars/116_1777851663_69f7dd0f3ab42.jpeg', 'IT | Digital Mkt | Web3 | Blockchain', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '231df9ae-b2af-498d-9ed0-d9e19fa9b6c0', 0, 0, 0, NULL, NULL, '2026-05-03 23:36:46', '2026-05-03 23:41:08', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"TypeScript\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Rust\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"Illustrator\",\"level\":\"beginner\"},{\"name\":\"Blockchain\",\"level\":\"beginner\"},{\"name\":\"Web3\",\"level\":\"beginner\"},{\"name\":\"Stellar\",\"level\":\"beginner\"},{\"name\":\"Ethereum\",\"level\":\"beginner\"}]'),
(117, 'Jesus Salazar', 'jesusrodolfosalazargonzalez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f218aa34-7385-42a7-bc75-19a769ff790b', 0, 0, 0, NULL, NULL, '2026-05-03 23:48:41', '2026-05-03 23:52:00', 0.00, 0, '[{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"}]'),
(118, 'garavito', 'jhonxs@gmail.com', NULL, NULL, NULL, 0, 0, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '611b1205-19c7-4a57-b74b-42c2c7b340d5', 0, 0, 0, NULL, NULL, '2026-05-04 00:30:41', '2026-05-07 01:11:37', 0.00, 0, NULL),
(119, 'Kevunchas', 'kevlyn1205@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$zZ3.QLBFqcRVY4ivL6rasOdtNCFFXIRzOSd0CifqoIcZSyjnpLlYm', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 00:52:27', '2026-05-04 00:52:27', 0.00, 0, NULL),
(120, 'cesarluislojancampoverde', 'cllcampoverde@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3b47feec-3abe-4922-aef0-fa89fad16f9a', 0, 0, 0, NULL, NULL, '2026-05-04 01:01:55', '2026-05-07 01:11:33', 0.00, 0, NULL),
(121, 'onelmachiz', 'machiz57@gmail.com', NULL, 'Soy programador con 3 años de experiencia en backend y front, me especializo en php, JS, y HTML, pero manejo otros lenguajes tambien.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5ecc1568-faca-4dc5-9634-34c9aca98f16', 0, 0, 0, NULL, NULL, '2026-05-04 01:34:28', '2026-05-07 01:11:29', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"advanced\"},{\"name\":\"Photoshop\",\"level\":\"beginner\"}]'),
(122, 'santiago cabaña', 'santiagocabana65@gmail.com', '/files/avatars/122_1777859890_69f7fd3268226.jpeg', 'Desarrollador Full-Stack con experiencia en Python (FastAPI), React y manejo de bases de datos con Supabase. Me dedico a transformar ideas en soluciones digitales funcionales, desde sistemas de gestión hasta aplicaciones de reserva.', 'https://github.com/santiagoncabana', 0, 1, NULL, 'user', 0, '$2y$10$6IY78ZcSEq7dV32233skkOQnrOkD2zwHeKgkqiR1wVgVNaczyQOa6', NULL, 0, NULL, NULL, NULL, '33d65267-5e01-408a-88ce-04b1a2423ca4', 0, 0, 0, NULL, NULL, '2026-05-04 01:37:25', '2026-05-08 23:49:47', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"}]'),
(123, 'emmanuelcastro', 'castroemmanuel067@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '411e5fda-2948-48e7-9eac-3bb2b66d3ce4', 0, 0, 0, NULL, NULL, '2026-05-04 01:46:58', '2026-05-07 01:11:23', 0.00, 0, NULL),
(124, 'edgardoescobar', 'escobaredgardo1114@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ab1f7c92-5ec3-438c-8403-ea214159eb29', 0, 0, 0, NULL, NULL, '2026-05-04 02:15:42', '2026-05-07 01:11:19', 0.00, 0, NULL),
(125, 'AndresRosales_', 'andrescod10@gmail.com', NULL, 'Ingeniero en Informática | Especialista en Angular, Astro, Laravel, .NET & NestJS | Desarrollador de Software', 'https://asoft-dev.surge.sh/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5154b925-6626-4ccf-8f58-4cd97b151860', 0, 0, 0, NULL, NULL, '2026-05-04 02:29:34', '2026-05-04 02:40:30', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"expert\"},{\"name\":\"C#\",\"level\":\"expert\"},{\"name\":\"C++\",\"level\":\"expert\"},{\"name\":\"Laravel\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"Angular\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"Linux\",\"level\":\"beginner\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"advanced\"},{\"name\":\"Azure\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"advanced\"}]'),
(126, 'Lavanapasarmuymal', 'marquinhioslopezzz@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$J4XqwLXlCfKIIciRxeVqDOE3b36VKyWjvitoYGDo64rGw.IV6XjTy', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 03:21:07', '2026-05-04 03:21:07', 0.00, 0, NULL),
(127, 'josemelguizo', 'josemelguizo147@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '65c835c2-a2d0-484b-94f4-5c8a33d6ea63', 0, 0, 0, NULL, NULL, '2026-05-04 03:48:07', '2026-05-07 01:11:11', 0.00, 0, NULL),
(128, 'valeriapaniaguacorts', 'valepaniagua1225@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7a441490-914b-4914-958f-79ce920f4fbb', 0, 0, 0, NULL, NULL, '2026-05-04 05:50:11', '2026-05-07 01:11:06', 0.00, 0, NULL),
(129, 'mateoryhr', 'mateoryhr29@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '091a1445-e0a9-4e8d-a206-f4e8c916fc9b', 0, 0, 0, NULL, NULL, '2026-05-04 11:08:57', '2026-05-07 01:11:02', 0.00, 0, NULL),
(130, 'sebastiancamero', 'sebastiancamero77@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e0e85b16-8222-40c7-afac-bb1df54d8ba2', 0, 0, 0, NULL, NULL, '2026-05-04 12:10:08', '2026-05-07 01:10:59', 0.00, 0, NULL),
(131, 'edwuar3000', '1001.31271481.ucla@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$mxUwk1/IUVXNEO.psHAb/utZAN0cxm4un1MjT83GbxYLUL17dJk/6', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 13:41:08', '2026-05-04 13:41:08', 0.00, 0, NULL),
(132, 'mariamagdalenamaluffstabio', 'maguimalu4@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9bffdc8c-fe9f-43fe-bf6a-42658fd85ec8', 0, 0, 0, NULL, NULL, '2026-05-04 15:16:01', '2026-05-07 01:10:53', 0.00, 0, NULL),
(133, 'jhamiltaborga', 'jhamiltaborga@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6e773085-045b-4e19-9d15-7cea79e4cd30', 0, 0, 0, NULL, NULL, '2026-05-04 15:26:13', '2026-05-07 01:10:47', 0.00, 0, NULL),
(134, 'julianmasis', 'masisjulian06@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e2fd5de7-b457-4854-b656-a0da7d76a78e', 0, 0, 0, NULL, NULL, '2026-05-04 15:28:21', '2026-05-07 01:10:43', 0.00, 0, NULL),
(135, 'marisagomez', 'gomezmarisa51@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ee5a5697-f8a1-4ddb-b3ad-29481a058e3b', 0, 0, 0, NULL, NULL, '2026-05-04 15:40:57', '2026-05-07 01:10:39', 0.00, 0, NULL),
(136, 'felipebecerra', 'becerrafelipe1502@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7bcb7118-12e9-4a4f-b98e-36bb4d9418f6', 0, 0, 0, NULL, NULL, '2026-05-04 16:51:29', '2026-05-07 01:10:35', 0.00, 0, NULL),
(137, 'Vicentem17', 'qmaury30@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$7aS5L7ERaR9i.bCpIRAJheUTtcmsNZ//hJBGfIFcqHwcCP/77w8r2', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 18:07:25', '2026-05-04 18:07:25', 0.00, 0, NULL),
(138, 'dereckgomez', 'dereckgomez340@gmail.com', '/files/avatars/138_1778125354_69fc0a2a4a827.jpeg', '¡Hola! Soy Dereck Gómez.\n\nSoy estudiante de Ingeniería en Informática en la UNEG (Universidad Nacional Experimental de Guayana).\nDedico la mayor parte de mi tiempo a estudiar lenguajes de programación como C/C++ y aprender sobre desarrollo web.\n\nFuera de la informática, soy un artista musical, enfocado principalmente a generos como reggaeton, merengue, trap, hip hop, etc. A la vez, hago contenido para mis redes sociales (tiktok, youtube e instagram).\n \nActualmente vivo en Puerto Ordaz Estado Bolívar Venezuela.\n\nRedes:\n\nTiktok: @dereckdisaw\n\nInstagram: @d.i.s.a.w\n\nYoutube: https://www.youtube.com/@d.i.s.a.w7041', 'https://portafolio-dereck-gomez-disaw.vercel.app/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1313fbad-0cf6-4e66-98ff-aa78de94d56a', 0, 0, 0, NULL, NULL, '2026-05-04 18:59:47', '2026-05-07 03:42:34', 0.00, 0, '[{\"name\":\"C++\",\"level\":\"beginner\"},{\"name\":\"Linux\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"}]'),
(139, 'brayanustariz', 'brayan17enrique@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'dc47d0fb-d49b-464b-aeb4-cbb2faa925da', 0, 0, 0, NULL, NULL, '2026-05-04 19:00:42', '2026-05-07 01:10:24', 0.00, 0, '[{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Django\",\"level\":\"beginner\"},{\"name\":\"Flask\",\"level\":\"beginner\"},{\"name\":\"Laravel\",\"level\":\"advanced\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MongoDB\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"AWS\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"Photoshop\",\"level\":\"intermediate\"},{\"name\":\"Illustrator\",\"level\":\"intermediate\"}]'),
(140, 'fabrizio', 'lumenexsol@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '30331b16-edca-44c9-ba8f-3cef1bc6bb94', 0, 0, 0, NULL, NULL, '2026-05-04 19:27:04', '2026-05-07 01:10:19', 0.00, 0, NULL),
(141, 'melanyvillegas', 'melanyvillegas2708@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e1bd4f2a-7c65-4493-9f6f-8338c5811c15', 0, 0, 0, NULL, NULL, '2026-05-04 20:45:30', '2026-05-07 01:10:12', 0.00, 0, NULL),
(142, 'brianandrade', 'brianandrade.m13@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd70cd242-6271-41d2-a9ff-b58262eaa741', 0, 0, 0, NULL, NULL, '2026-05-04 21:34:34', '2026-05-07 01:10:08', 0.00, 0, NULL),
(143, 'cristiancortes', 'bejaranno05cortes@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0d9a0cb1-bed5-4b60-8f43-31c0fbc1387c', 0, 0, 0, NULL, NULL, '2026-05-04 21:53:50', '2026-05-07 01:10:04', 0.00, 0, NULL);
INSERT INTO `users` (`id`, `username`, `email`, `avatar_url`, `bio`, `portfolio_url`, `verified`, `public_profile`, `created_at_profile`, `role`, `is_admin`, `password`, `wallet_address`, `human_id_verified`, `human_id_hash`, `human_id_verified_at`, `human_id_action_id`, `supabase_user_id`, `completed_tasks_count`, `tasks_today`, `tasks_this_week`, `last_task_created`, `cooldown_until`, `created_at`, `updated_at`, `average_rating`, `total_ratings`, `skills`) VALUES
(144, 'David Guzman', 'david77montealegre@gmail.com', '/files/avatars/144_1777934051_69f91ee3c10f8.png', 'Estudiante de Ingeniería de Sistemas con sólida formación técnica en el desarrollo de \naplicaciones web y plataformas tecnológicas. Cuento con experiencia comprobable en el stack \nMERN (React y Node.js), gestión de bases de datos SQL y automatización de procesos mediante \nn8n e Inteligencia Artificial. Me caracterizo por mi capacidad analítica para la resolución de \nproblemas, responsabilidad y comunicación asertiva en entornos ágiles. Poseo un fuerte interés \nen la arquitectura de software, el desarrollo Full Stack y la optimización de sistemas.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a905642f-64cb-4d48-9c0c-ceee5553e15e', 0, 0, 0, NULL, NULL, '2026-05-04 22:16:03', '2026-05-04 22:34:11', 0.00, 0, '[{\"name\":\"MongoDB\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"UI\\/UX Design\",\"level\":\"advanced\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"}]'),
(145, 'Diego Pimentel ', 'diegojpv@protonmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$9U/ynR0Q.mmNyHTNFL8dAuXg1O15oNxxg6CVDKU6S33x4Ur2mqqmi', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 22:57:48', '2026-05-04 22:57:48', 0.00, 0, NULL),
(146, 'Nicolás Del Fabro', 'nicolasdelfabro19@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$8flXqKXJA1jFZi/ZuVfup.u7FMptK/epvsic.t/jz2CrF8Ih/7zqO', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-04 23:41:58', '2026-05-04 23:41:58', 0.00, 0, NULL),
(147, 'sebastianveliz', 'sebacl247@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9913ef0d-2a13-4160-a696-623fe32c9298', 0, 0, 0, NULL, NULL, '2026-05-05 00:34:19', '2026-05-07 01:09:56', 0.00, 0, NULL),
(148, 'javierortizvaca', 'javierortizvaca129@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ebc8f994-c291-4a5b-a0ed-68eab9634a60', 0, 0, 0, NULL, NULL, '2026-05-05 00:42:45', '2026-05-07 01:09:51', 0.00, 0, NULL),
(149, 'sebastianarellano', 'sebastianarellanodev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e31831f3-c434-48eb-8858-43d6845423a8', 0, 0, 0, NULL, NULL, '2026-05-05 01:01:06', '2026-05-07 01:09:45', 0.00, 0, NULL),
(150, 'wheyoden', 'wheyoden02@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7dd70898-22e6-4a0d-857c-b3c3c07f86dc', 0, 0, 0, NULL, NULL, '2026-05-05 02:50:21', '2026-05-07 01:09:40', 0.00, 0, NULL),
(151, 'eliasestrabao', 'eestrabao46@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e9e9468f-a509-4979-ab60-050972cf277d', 0, 0, 0, NULL, NULL, '2026-05-05 03:44:36', '2026-05-07 01:09:34', 0.00, 0, NULL),
(152, 'vanesachitan', 'vanesachitan@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ede76238-f398-4675-9918-b44e89cf9d7a', 0, 0, 0, NULL, NULL, '2026-05-05 04:24:16', '2026-05-07 01:09:30', 0.00, 0, NULL),
(153, 'abrahamceballos', 'abrahamceballosnegocios@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '749f660e-c121-4bda-9792-7fd572a6d780', 0, 0, 0, NULL, NULL, '2026-05-05 14:31:49', '2026-05-07 01:09:20', 0.00, 0, NULL),
(154, 'juancamilobedoyabarbosa', 'juanbedoya.barbosa@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0f8b427e-3f2f-48d3-9eb3-ae85056817ed', 0, 0, 0, NULL, NULL, '2026-05-05 15:35:50', '2026-05-07 01:09:13', 0.00, 0, NULL),
(155, 'shirshirir', 'shirirshir@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd23cde0d-0cd6-46c7-9a36-bbe38cca6401', 0, 0, 0, NULL, NULL, '2026-05-05 16:07:41', '2026-05-07 01:08:56', 0.00, 0, NULL),
(156, 'marielyspia', 'marielyspina75@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0b5fd796-dfe9-4a5b-9e61-e054f3b34b4b', 0, 0, 0, NULL, NULL, '2026-05-05 16:38:13', '2026-05-07 01:08:52', 0.00, 0, NULL),
(157, 'Santiago Falvo', 'falvosanti@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '059cc507-843d-41b1-984b-33ec76fb8def', 0, 0, 0, NULL, NULL, '2026-05-05 16:48:12', '2026-05-05 17:09:54', 0.00, 0, '[{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"Spring\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"Angular\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"intermediate\"}]'),
(158, 'mfigueredo', 'mauriciofgaray@hotmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$5ar6FB384XfFmnQ/MJUXzeaaavvhprSCbnESxRC8okGX.vRnibnaa', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-05 16:58:22', '2026-05-05 16:58:22', 0.00, 0, NULL),
(159, 'jesstoussaint', 'jesus.toussaint10@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'aa3adc3c-6345-4a45-af57-fd58b0ceaa56', 0, 0, 0, NULL, NULL, '2026-05-05 17:31:16', '2026-05-07 01:08:46', 0.00, 0, NULL),
(160, 'joakojurao', 'talv4913@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'af546b74-f23a-45fe-97e5-11f05c497da6', 0, 0, 0, NULL, NULL, '2026-05-05 18:10:29', '2026-05-07 01:08:42', 0.00, 0, NULL),
(161, 'adrinpez', 'adrianpz1198@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e4fe326c-9877-44e6-92b3-404d90a23a64', 0, 0, 0, NULL, NULL, '2026-05-05 18:13:47', '2026-05-07 01:08:37', 0.00, 0, NULL),
(162, 'jonatanrodriguez', 'jr0921440@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '78028964-56bc-483f-acce-577e2ae6cca5', 0, 0, 0, NULL, NULL, '2026-05-05 18:30:28', '2026-05-07 01:08:33', 0.00, 0, NULL),
(163, 'johanjimenez', 'johanjimenezmlb@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6001464d-a199-4c3a-9e43-b5c48bacdc4c', 0, 0, 0, NULL, NULL, '2026-05-05 18:43:27', '2026-05-07 01:08:28', 0.00, 0, NULL),
(164, 'somospescaygana', 'somospescaygana@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0bf58971-61cf-4de8-8db1-25719e50c833', 0, 0, 0, NULL, NULL, '2026-05-05 19:32:31', '2026-05-07 01:08:22', 0.00, 0, NULL),
(165, 'kevinbedon', 'kevito418@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '732283a4-5b25-4411-9f35-77f86a3ce238', 0, 0, 0, NULL, NULL, '2026-05-05 19:34:00', '2026-05-07 01:08:17', 0.00, 0, NULL),
(166, 'sergioandresjimenez', 'sergio2jo13@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e08b97d8-b502-4de9-b60e-71220b1f0165', 0, 0, 0, NULL, NULL, '2026-05-05 19:34:07', '2026-05-07 01:08:14', 0.00, 0, NULL),
(167, 'Aron Augusto ', 'augustoaron75@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$coC9mk84ofQkd3xHE2GRoeSiuuDCfNbAuh9WYxjBwUNiX7x7h6eKu', NULL, 0, NULL, NULL, NULL, '636be76c-d80c-4543-8872-692ca352a9ee', 0, 0, 0, NULL, NULL, '2026-05-05 19:37:47', '2026-05-05 19:38:03', 0.00, 0, NULL),
(168, 'francozeta', 'francozeta2011@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '84c76d81-14d6-4068-b69a-9a61e1825947', 0, 0, 0, NULL, NULL, '2026-05-05 19:56:40', '2026-05-07 01:08:08', 0.00, 0, NULL),
(169, 'juanfelipecardenasgarcia', 'juanfelipelo64@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b0b4648f-8bd1-4aa0-a3d0-fa2095ea86b6', 0, 0, 0, NULL, NULL, '2026-05-05 20:39:53', '2026-05-07 01:08:03', 0.00, 0, NULL),
(170, 'reynernarvaez', 'narvaezreyner@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6ba57c36-dd94-46eb-8040-5fe366c2cc54', 0, 0, 0, NULL, NULL, '2026-05-05 21:26:35', '2026-05-07 01:07:57', 0.00, 0, NULL),
(171, 'angelvillarroel', 'angelj.h.v12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '80007fe2-bb5b-4fed-bd36-8f0b5b819daf', 0, 0, 0, NULL, NULL, '2026-05-05 22:38:26', '2026-05-07 01:07:53', 0.00, 0, NULL),
(172, 'nestorgoante', 'negavilaneson@outlook.com', NULL, 'Backend Developer especializado en Go, con experiencia liderando proyectos desde el diseño hasta el despliegue. He trabajado con arquitectura hexagonal, integración de LLMs y decisiones de infraestructura cloud en un entorno de consultoría. Me interesa seguir construyendo sistemas escalables y bien diseñados, en equipos donde la arquitectura importe.', 'https://nestordev.duckdns.org/', 0, 1, NULL, 'user', 0, '$2y$10$/vsPpaI58zymArcFO6yIt.5/KSl.nTklGod2Cxk5TqUV.8.iCfVdO', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 01:39:34', '2026-05-06 01:41:53', 0.00, 0, '[{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"Go\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"beginner\"}]'),
(173, 'FCarlos27', 'carloswilson2001@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$VGcNIGreKseiYIFuORueLec2kgDo7KoUAt5zhgr8ev/rLKM4JKRGu', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 02:09:54', '2026-05-06 02:09:54', 0.00, 0, NULL),
(174, 'karengiannetto', 'karengiannetto99@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '529e02c7-dfd0-4327-a392-a59fad1567e2', 0, 0, 0, NULL, NULL, '2026-05-06 02:15:23', '2026-05-07 01:07:44', 0.00, 0, NULL),
(175, 'agusbezagusbez', 'juegosagustinbez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '46b17abc-f91a-4364-bce6-1b247d44331c', 0, 0, 0, NULL, NULL, '2026-05-06 02:29:23', '2026-05-07 01:07:39', 0.00, 0, NULL),
(176, 'simonethgomez', 'simonethfernandez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b4054b92-87db-48d5-ad45-60bd970f1d80', 0, 0, 0, NULL, NULL, '2026-05-06 02:47:47', '2026-05-07 01:07:34', 0.00, 0, NULL),
(177, 'andresmarquez', 'andres03marquez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c3f80f0d-21e3-4b32-ad36-5a4c5854e24a', 0, 0, 0, NULL, NULL, '2026-05-06 03:20:32', '2026-05-07 01:07:15', 0.00, 0, NULL),
(178, '...', '.@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f2fc44bf-dab9-4104-9487-0a0b4749fddf', 0, 0, 0, NULL, NULL, '2026-05-06 03:47:42', '2026-05-06 03:55:13', 0.00, 0, NULL),
(179, 'emmanuelalexandersanchezvelasquez', 'emmanuel123.esv@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e710fdd9-0ae2-48a9-925a-6e265965c450', 0, 0, 0, NULL, NULL, '2026-05-06 03:48:05', '2026-05-07 01:07:10', 0.00, 0, NULL),
(180, 'TiagoP10', 'tiagoitec@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$atuen4i4Pc.qVGXtdBPbQemhCLWhamJ4mZ7lu0xvYKySOkdHm2OXO', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 04:24:53', '2026-05-06 04:24:53', 0.00, 0, NULL),
(181, 'Aurora', 'toralesaurora9@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$iJtEoR8zqxF79.M7S69DouUxEOn.ntINReAHVrSuxNGszx2BWvnKK', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 04:25:26', '2026-05-06 04:25:26', 0.00, 0, NULL),
(182, 'rodrigobohorquez', 'borqx2164@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '62077f61-6304-41d2-9fde-b2a1ede497a7', 0, 0, 0, NULL, NULL, '2026-05-06 05:01:15', '2026-05-07 01:07:01', 0.00, 0, NULL),
(183, 'SmartDz', 'xdzthemaster@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$QANxMEHHzCo7eZwC8f/g.ulZQRqmLjn.pYIR0JrsOYTTtBra33T3W', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 11:20:55', '2026-05-06 11:20:55', 0.00, 0, NULL),
(184, 'andrewalbertoaguilarabouassali', 'andrew02830@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '83e26ef6-09bb-4520-b0c1-2b5a1380c3e8', 0, 0, 0, NULL, NULL, '2026-05-06 11:40:48', '2026-05-07 01:06:56', 0.00, 0, NULL),
(185, 'jorgeivanpiedrahitaosorio', 'piedrahita.jorge.10@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2b3d5aa1-0695-4947-97b2-b57c304bf57f', 0, 0, 0, NULL, NULL, '2026-05-06 13:39:06', '2026-05-07 01:06:50', 0.00, 0, NULL),
(186, 'fumi', 'fumimatcha@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '188e9c57-750a-49f4-93af-b1327ee7f308', 0, 0, 0, NULL, NULL, '2026-05-06 14:04:17', '2026-05-07 01:06:45', 0.00, 0, NULL),
(187, 'juanalbertocortezurrea', 'cortezurreajuanalberto@gmail.com', NULL, NULL, 'https://github.com/Juan23456788977/Portafolio', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8331d7af-f14b-4726-9bbd-65026bebae34', 0, 0, 0, NULL, NULL, '2026-05-06 14:15:51', '2026-05-07 01:06:41', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"expert\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"C++\",\"level\":\"beginner\"},{\"name\":\"GraphQL\",\"level\":\"beginner\"},{\"name\":\"REST API\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"Angular\",\"level\":\"beginner\"},{\"name\":\"Next.js\",\"level\":\"beginner\"},{\"name\":\"MongoDB\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Photoshop\",\"level\":\"beginner\"},{\"name\":\"Adobe XD\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"Web3\",\"level\":\"beginner\"},{\"name\":\"Ethereum\",\"level\":\"beginner\"},{\"name\":\"Smart Contracts\",\"level\":\"beginner\"},{\"name\":\"Bitcoin\",\"level\":\"beginner\"}]'),
(188, 'fernandorecalde', 'fernandorecalde99@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e41b5626-3ea2-466d-8cb5-a20f7df4507b', 0, 0, 0, NULL, NULL, '2026-05-06 14:28:31', '2026-05-07 01:06:35', 0.00, 0, NULL),
(189, 'felipemartinis', 'felipemartinis97@gmail.com', NULL, 'Desarrollador en formación con experiencia en proyectos personales y academicos. Conocimientos en JavaScript, HTML, CSS, SQL, MongoDB, Node.js, etc.', 'https://github.comrepositories/FelipeMartinis?tab=', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '71c96c41-d641-43fd-9ad4-fe99d1ba58a5', 0, 0, 0, NULL, NULL, '2026-05-06 14:47:30', '2026-05-06 14:54:21', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"Express\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"Angular\",\"level\":\"intermediate\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Azure\",\"level\":\"beginner\"},{\"name\":\"AWS\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"}]'),
(190, 'cristopherformandoy', 'cformandoy@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2b94de3e-e2fd-4b95-9b7d-2a4c664b2f07', 0, 0, 0, NULL, NULL, '2026-05-06 15:05:41', '2026-05-07 01:06:27', 0.00, 0, NULL),
(191, 'alessiapea', 'alessiasle.it@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '74cb0e8b-3fed-4a9b-985d-cdf60168e4c6', 0, 0, 0, NULL, NULL, '2026-05-06 15:26:58', '2026-05-07 01:06:23', 0.00, 0, NULL),
(192, 'joseman', 'conde.mencia69@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a06f2032-54f9-4dbe-90d6-d1fa7f906f60', 0, 0, 0, NULL, NULL, '2026-05-06 16:01:34', '2026-05-07 01:06:18', 0.00, 0, NULL),
(193, 'coder123af', 'retoaf@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '$2y$10$dWgAhE.Nu6JhnQrqiqC9UeKj6KIXRVW/1vRF9JbYKoEJQLRss8G0G', NULL, 0, NULL, NULL, NULL, NULL, 0, 0, 0, NULL, NULL, '2026-05-06 17:25:30', '2026-05-06 17:25:30', 0.00, 0, NULL),
(194, 'FreilaN', 'exauserrano24@gmail.com', NULL, NULL, 'https://portafoliojesusserrano.netlify.app/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3e15e31a-b519-40f2-bd32-d80456bd7316', 0, 0, 0, NULL, NULL, '2026-05-06 17:40:43', '2026-05-06 17:46:15', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"expert\"},{\"name\":\"TypeScript\",\"level\":\"expert\"},{\"name\":\"Python\",\"level\":\"expert\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"C++\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"Kotlin\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Django\",\"level\":\"advanced\"},{\"name\":\"Laravel\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"expert\"},{\"name\":\"HTML\",\"level\":\"expert\"},{\"name\":\"CSS\",\"level\":\"expert\"},{\"name\":\"React\",\"level\":\"expert\"},{\"name\":\"Vue.js\",\"level\":\"expert\"},{\"name\":\"MySQL\",\"level\":\"expert\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"expert\"}]'),
(195, 'luismiquilena', 'luismiquilena75@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd475595e-a2fe-4a1d-8fed-a715c61c6cd5', 0, 0, 0, NULL, NULL, '2026-05-06 17:47:58', '2026-05-07 01:06:12', 0.00, 0, NULL),
(196, 'danieloliveros', 'danieloliveros4899@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd54544f2-2ce4-4bab-9ad9-04659e0f6c95', 0, 0, 0, NULL, NULL, '2026-05-06 17:57:47', '2026-05-07 01:06:08', 0.00, 0, NULL),
(197, 'valentnmichilena', 'valentin.michilena@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '53a9be57-83de-4d53-92ce-7c9da1d1625f', 0, 0, 0, NULL, NULL, '2026-05-06 18:11:27', '2026-05-07 01:06:03', 0.00, 0, NULL),
(198, 'wilberkledezma', 'ledezma.wilberk@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b4a54b23-8fc6-4e86-ad81-3f6eac881170', 0, 0, 0, NULL, NULL, '2026-05-06 18:16:04', '2026-05-07 01:05:57', 0.00, 0, NULL),
(199, 'maryperez', 'doonnies@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '387fed19-9dea-418c-bc50-db830bec657d', 0, 0, 0, NULL, NULL, '2026-05-06 18:28:09', '2026-05-07 01:05:51', 0.00, 0, NULL),
(200, 'hectorqz', 'hectorsegundo23@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd483a6cb-7d0f-41c2-8b64-98c847eda58e', 0, 0, 0, NULL, NULL, '2026-05-06 18:31:30', '2026-05-07 01:05:44', 0.00, 0, NULL),
(201, 'erimarmedina', 'erimarmedinag@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd6758acc-a5c0-4d07-a8fd-9064df7240bb', 0, 0, 0, NULL, NULL, '2026-05-06 20:08:14', '2026-05-06 20:09:41', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"C++\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"SASS\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"}]'),
(202, 'patriciogonzlez', 'patricio.gonzalez1733@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '93894c9b-03bd-4120-b120-01b65365bd20', 0, 0, 0, NULL, NULL, '2026-05-06 21:14:40', '2026-05-07 01:05:39', 0.00, 0, NULL),
(203, 'luisngelpimentellpez', 'lh.luis.pimentel@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fbf8ae44-35c0-41d8-b02b-c66bff9f2829', 0, 0, 0, NULL, NULL, '2026-05-06 21:24:34', '2026-05-07 01:05:33', 0.00, 0, NULL),
(204, 'archi', 'archivanibaldoguzmanjuarez701@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '97d7e3ce-bdf0-4933-913a-2fe3316b13f7', 0, 0, 0, NULL, NULL, '2026-05-06 23:42:46', '2026-05-06 23:48:47', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"beginner\"},{\"name\":\"PHP\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Express\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"SASS\",\"level\":\"beginner\"},{\"name\":\"MongoDB\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"beginner\"}]'),
(206, 'anthonyrivero', 'anthonyrivero322@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e3cbe963-8cce-4168-b340-0785b9f0e223', 0, 0, 0, NULL, NULL, '2026-05-07 01:45:55', '2026-05-07 01:45:55', 0.00, 0, NULL),
(207, 'anyergalindez', 'anyer.galindez22@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c97e1ec2-1ec9-49b1-98d8-491d4ae9db02', 0, 0, 0, NULL, NULL, '2026-05-07 03:07:29', '2026-05-07 03:11:19', 0.00, 0, '[{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"}]'),
(208, 'josdanielmoreraelizondo', 'j.morera.2@estudiantec.cr', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'de5182bd-17f8-44b8-ba34-caae67b0177e', 0, 0, 0, NULL, NULL, '2026-05-07 03:46:26', '2026-05-07 03:46:26', 0.00, 0, NULL),
(209, 'ginogongora', 'gino.gongora097@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9eb2fb2b-43a1-4b16-bc8b-92e13cbbbb93', 0, 0, 0, NULL, NULL, '2026-05-07 07:22:08', '2026-05-07 07:22:08', 0.00, 0, NULL),
(210, 'ortuojaime', 'jaime932g6@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '63399e6a-ca18-4afa-af3a-b506f01d728b', 0, 0, 0, NULL, NULL, '2026-05-07 11:59:14', '2026-05-07 11:59:14', 0.00, 0, NULL),
(211, 'chouriochourio', 'chouriochourio74@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ab421c25-e0c7-4a31-a944-200338d917d8', 0, 0, 0, NULL, NULL, '2026-05-07 13:47:59', '2026-05-07 13:47:59', 0.00, 0, NULL),
(212, 'ezequieldomnguez', 'ezequieldominguez11@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0af17e26-c603-45ea-900e-4d601419cfe3', 0, 0, 0, NULL, NULL, '2026-05-07 16:01:05', '2026-05-07 16:01:05', 0.00, 0, NULL),
(213, 'joslpez', 'jflo1937@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd90477cc-2c8b-46be-8900-e78905d006ab', 0, 1, 1, '2026-05-07 17:28:57', '2026-05-07 19:28:57', '2026-05-07 17:28:08', '2026-05-07 17:28:57', 0.00, 0, NULL),
(214, 'angelesvalera', 'angelesvalera824@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '754d2b73-54d0-4682-80d3-613b570ce69e', 0, 0, 0, NULL, NULL, '2026-05-07 19:11:35', '2026-05-07 19:11:35', 0.00, 0, NULL),
(215, 'Francisco Sáez', 'pancho.asg@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1b4b1f46-1cbe-415e-93b6-20015350235c', 0, 0, 0, NULL, NULL, '2026-05-07 19:36:22', '2026-05-08 00:26:39', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"Django\",\"level\":\"advanced\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"beginner\"}]'),
(216, 'sebastianvargasramirez', 'zain-wave@outlook.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0929b941-dbf8-462e-9c70-594094ac2646', 0, 0, 0, NULL, NULL, '2026-05-07 21:15:35', '2026-05-07 21:15:35', 0.00, 0, NULL),
(217, 'emanuelramos19', 'emanuelramos19@outlook.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '56aaca71-8237-4fbc-a505-aaeb1968e8d9', 0, 0, 0, NULL, NULL, '2026-05-07 22:04:21', '2026-05-07 22:04:21', 0.00, 0, NULL),
(218, 'hectorqz_7b061145', 'qzhector02@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7b061145-2fa7-44e8-8739-e4a8c9d70582', 0, 0, 0, NULL, NULL, '2026-05-07 22:47:05', '2026-05-07 22:47:06', 0.00, 0, NULL),
(219, 'danielfiguera', 'danielfiguerac@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '24490a3f-2621-4662-8422-bd0b4997d707', 0, 0, 0, NULL, NULL, '2026-05-07 23:30:54', '2026-05-07 23:30:54', 0.00, 0, NULL),
(220, 'noelrodriguez', 'dragonoel34@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd525fabe-5619-4190-9afb-8218ef4f5592', 0, 0, 0, NULL, NULL, '2026-05-07 23:32:04', '2026-05-07 23:32:04', 0.00, 0, NULL),
(221, 'mariangelmarcano', 'mariangelmarcano228@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '00001890-ef76-4130-befb-fe9da8059742', 0, 0, 0, NULL, NULL, '2026-05-08 01:20:05', '2026-05-08 01:20:05', 0.00, 0, NULL),
(222, 'andrsalejandrotorresgonzlez', 'andytorresgonz@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0a6f0f92-354d-41f3-b53d-b4582953b9de', 0, 0, 0, NULL, NULL, '2026-05-08 02:31:27', '2026-05-08 02:31:27', 0.00, 0, NULL),
(223, 'raulleon', 'raulleonal2@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f9f186e1-6b8e-4734-a8e6-edba9959bbe7', 0, 0, 0, NULL, NULL, '2026-05-08 04:30:45', '2026-05-08 04:30:45', 0.00, 0, NULL),
(224, 'broogame14', 'broogame14@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '60d102b6-a564-40eb-90b5-62134bf81b83', 0, 0, 0, NULL, NULL, '2026-05-08 06:05:52', '2026-05-08 06:05:52', 0.00, 0, NULL),
(225, 'diquintero', 'diquintero@unal.edu.co', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f29caec1-df23-43fa-82ef-f5e5bf592fcc', 0, 0, 0, NULL, NULL, '2026-05-08 07:11:21', '2026-05-08 07:16:11', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"expert\"},{\"name\":\"Go\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"MongoDB\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"}]'),
(226, 'Rogelio Olarte', 'rogelioolarte2222@gmail.com', NULL, 'FullStack Developer creating end-to-end web applications.', 'https://github.com/rogelioolarte', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '342d3b96-26c3-4d77-92c4-c44203b6fbd2', 0, 0, 0, NULL, NULL, '2026-05-08 07:42:20', '2026-05-08 07:53:09', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"Go\",\"level\":\"advanced\"},{\"name\":\"Express\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Django\",\"level\":\"intermediate\"},{\"name\":\"Spring\",\"level\":\"advanced\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"SCSS\",\"level\":\"intermediate\"},{\"name\":\"SASS\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Angular\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"Kubernetes\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"Photoshop\",\"level\":\"intermediate\"}]'),
(227, 'mariorodriguez', 'mrodr2022@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1d40a868-abc8-44fc-9118-9db57490a856', 0, 0, 0, NULL, NULL, '2026-05-08 07:50:24', '2026-05-08 07:50:24', 0.00, 0, NULL),
(228, 'jonathansanabria', 'jonathan.sanabria.rojas@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7671969c-10c4-46fd-935a-6e1ada403272', 0, 0, 0, NULL, NULL, '2026-05-08 07:59:44', '2026-05-08 07:59:44', 0.00, 0, NULL),
(229, 'carlosdavidbt', 'carlos.david1806@gmail.com', '/files/avatars/229_1778229834_69fda24a13541.jpg', 'Desarrollador Full Stack con experiencia en desarrollo web usando Laravel, Vue 3, Inertia y Flutter. He trabajado en proyectos en producción, incluyendo sistemas administrativos y plataformas para restaurantes con manejo de inventario, pedidos, ventas y múltiples sucursales. Me enfoco en crear soluciones funcionales, escalables y orientadas a resolver necesidades reales del negocio. Tengo facilidad para adaptarme, aprender nuevas tecnologías y trabajar tanto en frontend como backend.', 'https://porfoliocdavidv2.netlify.app/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b55ec259-d2b4-47e0-b539-f801dfb6e5f4', 0, 0, 0, NULL, NULL, '2026-05-08 08:42:39', '2026-05-08 08:45:37', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"GraphQL\",\"level\":\"intermediate\"},{\"name\":\"Dart\",\"level\":\"intermediate\"},{\"name\":\"Laravel\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"SCSS\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"Photoshop\",\"level\":\"intermediate\"}]'),
(230, 'andreatorre', 'andretrabajot@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'cf002b7b-362c-4e78-a82d-c2fd4d28f099', 0, 0, 0, NULL, NULL, '2026-05-08 12:19:19', '2026-05-08 12:19:19', 0.00, 0, NULL),
(231, 'hanielpaez', 'handavi12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a39ef318-58a6-4328-af50-80e46754bbff', 0, 0, 0, NULL, NULL, '2026-05-08 12:38:35', '2026-05-08 12:38:35', 0.00, 0, NULL),
(232, 'naomirodriguez', 'naomirodriguezdiaz274@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '05d5b515-a60c-44c6-a3ff-2c866d95d5d2', 0, 0, 0, NULL, NULL, '2026-05-08 13:42:31', '2026-05-08 13:42:31', 0.00, 0, NULL),
(233, 'allisonzavala', 'zavalaallison8@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f4876ad1-41bf-4052-9f56-3601a6ffccc2', 0, 0, 0, NULL, NULL, '2026-05-08 15:05:49', '2026-05-08 15:05:49', 0.00, 0, NULL),
(234, 'axelcaete', 'canetej716@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'bfd32d49-80a5-4504-9eeb-6aadc5224f80', 0, 0, 0, NULL, NULL, '2026-05-08 15:19:41', '2026-05-08 15:19:41', 0.00, 0, NULL),
(235, 'alkeidesantonio', 'alkeidesantonio@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c3907db2-9d0a-42cb-ba18-ea6964d3dcc0', 0, 0, 0, NULL, NULL, '2026-05-08 15:20:37', '2026-05-08 15:20:37', 0.00, 0, NULL),
(236, 'yradyjesus5', 'yradyjesus5@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '84f52b08-aad8-42c5-9a16-9ee2d2e12d53', 0, 0, 0, NULL, NULL, '2026-05-08 15:45:43', '2026-05-08 15:45:43', 0.00, 0, NULL),
(237, 'valerialejandraob', 'valerialejandraob@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0a12a2ce-7f42-4649-89d9-538c8a0ae5b3', 0, 0, 0, NULL, NULL, '2026-05-08 15:46:27', '2026-05-08 15:46:27', 0.00, 0, NULL),
(238, 'Orlando Daniel', 'orlandobelisario1@gmail.com', NULL, 'Ingeniero de Sistemas proactivo, con una profunda pasión por la programación y el desarrollo de soluciones tecnológicas eficientes. Más de 6 años de experiencia en el ciclo de vida completo del desarrollo de software, destacando por mi capacidad para la resolución de problemas complejos, el aprendizaje rápido de nuevas tecnologías y la adaptación a entornos dinámicos.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2b53546d-cdad-460b-9cac-20db0980c4af', 0, 0, 0, NULL, NULL, '2026-05-08 16:47:49', '2026-05-08 16:52:50', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"C++\",\"level\":\"beginner\"},{\"name\":\"Laravel\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Photoshop\",\"level\":\"beginner\"},{\"name\":\"Illustrator\",\"level\":\"beginner\"},{\"name\":\"Blockchain\",\"level\":\"beginner\"}]'),
(239, 'fernandaestrada', 'fernandaestrada7451@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '572584f2-ec7a-44be-b94d-9d335db8378c', 0, 0, 0, NULL, NULL, '2026-05-08 17:05:02', '2026-05-08 17:05:02', 0.00, 0, NULL),
(240, 'diegocorso', 'corso.diegob@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '16c81115-cec2-4c29-abc2-49bb543d82e9', 0, 0, 0, NULL, NULL, '2026-05-08 22:56:17', '2026-05-08 22:56:17', 0.00, 0, NULL),
(241, 'diegoignaciocoronadoespinoza', 'dcoronado@utem.cl', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c4798ec4-c053-4e6a-a766-492c3c6dba57', 0, 0, 0, NULL, NULL, '2026-05-09 01:11:28', '2026-05-09 01:11:28', 0.00, 0, NULL),
(242, 'vlissingh', 'mvrtn.kom@gmail.com', '/files/avatars/242_1778386657_6a0006e1ebf0a.png', 'Freelancer publicitario', 'https://www.behance.net/martinherrera19https://www.behance.net/martinherrera19', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '834702a9-513a-47e4-9028-e2359028fe74', 0, 0, 0, NULL, NULL, '2026-05-10 02:16:08', '2026-05-10 04:17:49', 0.00, 0, '[{\"name\":\"Photoshop\",\"level\":\"advanced\"},{\"name\":\"Adobe XD\",\"level\":\"advanced\"},{\"name\":\"Illustrator\",\"level\":\"intermediate\"}]'),
(243, 'lautaromoro', 'lauta.moro04@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5099a717-9294-4974-837a-6260f9e63eb1', 0, 0, 0, NULL, NULL, '2026-05-10 03:09:08', '2026-05-10 03:09:08', 0.00, 0, NULL),
(244, 'joaquinfarfan_2f188f7d', 'inboxblessedux@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2f188f7d-ee93-433f-8b74-2985ec5cc8e4', 0, 0, 0, NULL, NULL, '2026-05-10 19:06:51', '2026-05-10 19:06:51', 0.00, 0, NULL),
(245, 'angelosanchez', 'angelorewrk@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8c300b35-b691-4dc7-ad1f-b0088d41ba0e', 0, 0, 0, NULL, NULL, '2026-05-10 21:28:25', '2026-05-10 21:28:25', 0.00, 0, NULL),
(246, 'francojuarez', 'francodanielj@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b117c204-ccd8-4e3d-b97f-77cbaee18a44', 0, 0, 0, NULL, NULL, '2026-05-10 23:36:31', '2026-05-10 23:41:22', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"C#\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"Express\",\"level\":\"advanced\"},{\"name\":\"Django\",\"level\":\"intermediate\"},{\"name\":\"GraphQL\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Spring\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"advanced\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"AWS\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"advanced\"}]'),
(247, 'luisezapata2006', 'luisezapata2006@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '828d6e68-0f16-4ea4-8f61-9bb5e0fe1ce6', 0, 0, 0, NULL, NULL, '2026-05-11 11:35:04', '2026-05-11 11:35:04', 0.00, 0, NULL),
(248, 'gonzalochacnthezach', 'thezachgroup@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8263c66f-485d-4180-aec6-6fdffaae123f', 0, 0, 0, NULL, NULL, '2026-05-12 22:03:19', '2026-05-12 22:03:19', 0.00, 0, NULL),
(249, 'sofiverse', 'vcsofi.web3@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '57f50be1-d3dd-4d18-80f3-1cc8a6d8fbe5', 0, 0, 0, NULL, NULL, '2026-05-12 22:53:11', '2026-05-12 23:01:22', 0.00, 0, NULL),
(250, 'danielfisseha', 'danielfiss2002@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '81ab9381-3140-4334-a8be-192fbfc9ac30', 0, 0, 0, NULL, NULL, '2026-05-12 23:20:05', '2026-05-12 23:20:05', 0.00, 0, NULL),
(251, 'josedelgado', 'jose.delgux@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '50a63f20-2105-4409-adb0-35a81dda784b', 0, 0, 0, NULL, NULL, '2026-05-13 13:19:53', '2026-05-13 13:19:53', 0.00, 0, NULL),
(252, 'lulojrz18', 'lulojrz18@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '3e7733e8-48b0-43aa-be1f-a40061ef8147', 0, 0, 0, NULL, NULL, '2026-05-13 14:05:45', '2026-05-13 14:05:45', 0.00, 0, NULL),
(253, 'yosmerpildain', 'yosmerpildainp@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7fc6b684-a4d4-4832-84e5-56bcf09d1826', 0, 0, 0, NULL, NULL, '2026-05-13 14:18:37', '2026-05-13 14:18:37', 0.00, 0, NULL),
(254, 'nicoleramos', 'ndramosmejia@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '204dc827-c9db-4a64-8472-3c4f691a8e4e', 0, 0, 0, NULL, NULL, '2026-05-13 14:59:55', '2026-05-13 14:59:55', 0.00, 0, NULL),
(255, 'josealonsoparedesmarin', 'japcrowley.thetraveler@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '277e47a2-daa7-44b5-85b8-420622a03bbb', 0, 0, 0, NULL, NULL, '2026-05-13 16:56:47', '2026-05-13 16:56:47', 0.00, 0, NULL),
(256, 'vaiosx', 'vaiogioss@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a799f3b4-41d5-47ef-9251-ea152e48e5f2', 0, 0, 0, NULL, NULL, '2026-05-13 18:15:16', '2026-05-13 18:15:16', 0.00, 0, NULL),
(257, 'ojjofficial', 'soraty12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a90ecf9c-e6d4-4a18-9ad4-dadb6d4b3f03', 0, 0, 0, NULL, NULL, '2026-05-13 19:05:36', '2026-05-13 19:05:36', 0.00, 0, NULL),
(258, 'facundofleitas', 'facufleitasss@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '21b56751-c463-411c-ab09-7e1196f544d6', 0, 0, 0, NULL, NULL, '2026-05-13 23:19:02', '2026-05-13 23:19:02', 0.00, 0, NULL),
(259, 'fernandoalfonso', 'echinfer@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b14393c3-73db-4ee6-b0a8-e410ef66dda7', 0, 0, 0, NULL, NULL, '2026-05-13 23:20:47', '2026-05-13 23:20:47', 0.00, 0, NULL),
(260, 'patriciojimenez', 'patriciojimenez838@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd8b807cc-2e2e-408b-8f37-8ea1258e53d5', 0, 0, 0, NULL, NULL, '2026-05-14 03:06:17', '2026-05-14 03:06:17', 0.00, 0, NULL),
(261, 'lucasrodriguez', 'lr145263lr@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9c3aea58-abf1-4a59-932c-880a0af31663', 0, 0, 0, NULL, NULL, '2026-05-14 04:25:31', '2026-05-14 04:25:31', 0.00, 0, NULL),
(262, 'geohandrynuez', 'geohaxd@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '435822fa-a3c4-450d-8c84-7a9af96d2916', 0, 0, 0, NULL, NULL, '2026-05-14 04:53:17', '2026-05-14 04:53:17', 0.00, 0, NULL),
(263, 'sebastiangrisales', 'grisales1214@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '577adc02-2932-4e4d-ae83-c7f08605cb2a', 0, 0, 0, NULL, NULL, '2026-05-14 05:26:41', '2026-05-14 05:26:41', 0.00, 0, NULL),
(264, 'valentinamoreno', 'valentinamoreno2002@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd5ecdd5e-1e8d-4f72-972b-ecf3f301a297', 0, 0, 0, NULL, NULL, '2026-05-14 05:42:32', '2026-05-14 05:42:32', 0.00, 0, NULL),
(265, 'saulmuoz', 'sam.pedreros14@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '852dd534-ad4b-4297-8a11-94dfdac3878d', 0, 0, 0, NULL, NULL, '2026-05-14 05:43:56', '2026-05-14 05:43:56', 0.00, 0, NULL),
(266, 'miguelangel', 'auto7557@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7b5707fd-6fe4-42d7-ba17-69a35cc2b690', 0, 0, 0, NULL, NULL, '2026-05-14 07:04:04', '2026-05-14 07:04:04', 0.00, 0, NULL),
(267, 'Rrrrr', 'jkgessqqhk@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '908d55d1-1ddd-47f1-a6f0-44ac8d63ee6b', 0, 0, 0, NULL, NULL, '2026-05-14 07:55:02', '2026-05-14 08:05:41', 0.00, 0, NULL),
(268, 'marketingnuc', 'marketsenos@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f1f57d4f-dc55-402f-955b-c6f72138faa5', 0, 0, 0, NULL, NULL, '2026-05-14 10:36:06', '2026-05-14 10:36:06', 0.00, 0, NULL),
(269, 'osunacode', 'osunacode@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'abbb7801-ce02-466a-bf80-c32b2350bd6a', 0, 0, 0, NULL, NULL, '2026-05-14 12:56:51', '2026-05-14 12:56:51', 0.00, 0, NULL),
(270, 'diegokarabin', 'diegokarabin@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '15746a50-b855-499a-8f59-a808ccd5cfd4', 0, 0, 0, NULL, NULL, '2026-05-14 13:03:58', '2026-05-14 13:03:58', 0.00, 0, NULL),
(271, 'jesspolanco', 'jesusmanuelpolancogarcia51@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '32d665e8-adac-46fd-bb62-9a5de0593daa', 0, 0, 0, NULL, NULL, '2026-05-14 13:26:42', '2026-05-14 13:26:42', 0.00, 0, NULL),
(272, 'manuehbodoke', 'bodokemanueh@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '40aff06d-af78-4de4-a7f5-6652e448b3ee', 0, 0, 0, NULL, NULL, '2026-05-14 14:09:44', '2026-05-14 14:09:44', 0.00, 0, NULL),
(273, 'kevin', 'kamirhplozano11@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1ba89054-604f-4a55-8a01-96e1736820d9', 0, 0, 0, NULL, NULL, '2026-05-14 15:10:06', '2026-05-14 15:10:06', 0.00, 0, NULL),
(274, 'toritsesanmiki', 'toritsesanme@gmail.com', NULL, 'I\'m a civil engineering student and a graphic designer.', 'https://drive.google.com/drive/folders/1wtg9n5C4IEMWWsNTCrBAhsuHqsy84Urn', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '73e5801f-4120-425f-b19e-51ac2186dcd9', 0, 0, 0, NULL, NULL, '2026-05-14 16:18:25', '2026-05-14 17:16:57', 0.00, 0, '[{\"name\":\"Photoshop\",\"level\":\"intermediate\"}]'),
(275, 'danielolivar', 'daniolivar2912@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c5b0f13a-66e7-4ba7-bc2d-47c464c40e7c', 0, 0, 0, NULL, NULL, '2026-05-14 16:43:54', '2026-05-14 16:43:54', 0.00, 0, NULL),
(276, 'omargarcia', 'omgarcis@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b8217f41-fa6a-49f4-bf69-9f986230283c', 0, 0, 0, NULL, NULL, '2026-05-14 16:57:38', '2026-05-14 16:57:38', 0.00, 0, NULL),
(277, 'jesusmejias', 'jesuscalles2002@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ef41e056-b6ff-425f-86fb-76a79f6aef72', 0, 0, 0, NULL, NULL, '2026-05-14 17:19:07', '2026-05-14 17:19:07', 0.00, 0, NULL),
(278, 'carloscrdenas', 'cardenasciccone@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f55a081d-5e5b-42fa-8f48-0e7352efd4de', 0, 0, 0, NULL, NULL, '2026-05-14 17:28:01', '2026-05-14 17:28:01', 0.00, 0, NULL),
(279, 'juandacr25', 'juandacr25@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '91184c06-5faf-4fef-a401-004a3d376f02', 0, 0, 0, NULL, NULL, '2026-05-14 17:36:22', '2026-05-14 17:36:22', 0.00, 0, NULL),
(280, 'alexisjankowski', 'alexis.janko@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fc239f14-598c-4704-b5ce-9eb0fdb47cab', 0, 0, 0, NULL, NULL, '2026-05-14 21:54:52', '2026-05-14 21:54:52', 0.00, 0, NULL),
(281, 'renzobanegas', 'renzobanegas720@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5b9225ab-9a3a-4323-8489-2f425babc546', 0, 0, 0, NULL, NULL, '2026-05-14 22:20:41', '2026-05-14 22:20:41', 0.00, 0, NULL),
(282, 'robertozuiga', 'missingno765@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f143e520-b106-4bad-96bc-829a7c4d508e', 0, 0, 0, NULL, NULL, '2026-05-14 22:23:50', '2026-05-14 22:23:50', 0.00, 0, NULL),
(283, 'gnesismoya', 'genesismoya4toa@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '374dd424-a8ce-4330-81f4-5de324422deb', 0, 0, 0, NULL, NULL, '2026-05-14 23:02:42', '2026-05-14 23:02:42', 0.00, 0, NULL),
(284, 'guillermolescano', 'guillermolescano28@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9718eb4b-df16-4a8e-86cc-bd07ca780636', 0, 0, 0, NULL, NULL, '2026-05-15 00:10:55', '2026-05-15 00:10:55', 0.00, 0, NULL),
(285, 'mateomorelo', 'morelovergarag@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b50eea1a-47b6-4f8a-aab0-1e4d819b5b3f', 0, 0, 0, NULL, NULL, '2026-05-15 00:32:44', '2026-05-15 00:32:45', 0.00, 0, NULL);
INSERT INTO `users` (`id`, `username`, `email`, `avatar_url`, `bio`, `portfolio_url`, `verified`, `public_profile`, `created_at_profile`, `role`, `is_admin`, `password`, `wallet_address`, `human_id_verified`, `human_id_hash`, `human_id_verified_at`, `human_id_action_id`, `supabase_user_id`, `completed_tasks_count`, `tasks_today`, `tasks_this_week`, `last_task_created`, `cooldown_until`, `created_at`, `updated_at`, `average_rating`, `total_ratings`, `skills`) VALUES
(286, 'ramironez', 'ramirosebastiann@gmail.com', '/files/avatars/286_1778807586_6a06732284f95.jpg', 'Estudiante de Licenciatura en Sistemas de Información. Conocimientos en desarrollo web y flujos inteligentes (n8n)\nGitHub: https://github.com/ramiro-nunez', 'https://github.com/ramiro-nunez', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2c76350e-653e-4d98-add4-30e4675f5e69', 0, 0, 0, NULL, NULL, '2026-05-15 01:09:35', '2026-05-15 01:16:43', 0.00, 0, '[{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Laravel\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Django\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"intermediate\"}]'),
(287, 'manueljauregui', 'jaureguiimanuel07@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '24cbf057-d591-40b8-b775-7b83c7f944b2', 0, 0, 0, NULL, NULL, '2026-05-15 01:44:44', '2026-05-15 01:47:44', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"JavaScript\",\"level\":\"beginner\"}]'),
(288, 'agustin balcazar', 'balcazaragustyn@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5ed5d0da-0eca-4ffa-8c92-27654b59690f', 0, 0, 0, NULL, NULL, '2026-05-15 01:54:28', '2026-05-15 01:55:42', 0.00, 0, '[{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"MongoDB\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"GCP\",\"level\":\"beginner\"},{\"name\":\"AWS\",\"level\":\"beginner\"},{\"name\":\"Kotlin\",\"level\":\"beginner\"},{\"name\":\"Django\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"beginner\"}]'),
(289, 'hannafuentes', 'hanna.32480710@uru.edu', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '545cc813-71ab-4b33-82f4-80e42de320ab', 0, 0, 0, NULL, NULL, '2026-05-15 01:54:53', '2026-05-15 01:54:53', 0.00, 0, NULL),
(290, 'Sebastián Maya', 'sebamaya12@gmail.com', NULL, NULL, NULL, 0, 0, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9b708d70-ec10-4aa5-8c1e-e68f0601ba65', 0, 0, 0, NULL, NULL, '2026-05-15 02:03:12', '2026-05-15 02:05:05', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"beginner\"}]'),
(291, 'hazielvictoresquivelcalvo', 'hazielvictor5@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a021e994-2fcf-4b51-9a8f-83d39651b9ed', 0, 0, 0, NULL, NULL, '2026-05-15 02:08:56', '2026-05-15 02:08:56', 0.00, 0, NULL),
(292, 'eduardoemanuelguzman', 'emanuel250gameryt@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '799940a8-f0d8-4207-9ed1-b31c5254eacf', 0, 0, 0, NULL, NULL, '2026-05-15 02:42:22', '2026-05-15 02:42:22', 0.00, 0, NULL),
(293, 'Juan Castañeda', 'juanp.castaneda04@gmail.com', NULL, 'Estudiante de ingeniería informática de segundo año. Sé desarrollar sistemas web tanto con backend como con frontend. Me gusta ser atento y abordar todos los requisitos posibles.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '162553bf-66ae-4eb1-a3ce-155ad4e46cd5', 0, 0, 0, NULL, NULL, '2026-05-15 03:48:28', '2026-05-15 03:52:28', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"}]'),
(294, 'joelsojo', 'joelsojo2003@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '636f68da-1849-4529-ad9b-c4d249dffe97', 0, 0, 0, NULL, NULL, '2026-05-15 06:54:52', '2026-05-15 06:54:52', 0.00, 0, NULL),
(295, 'danielhuancahuari', 'elrigos16@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '07e68718-376c-4d6a-a034-3fffcffae7e3', 0, 0, 0, NULL, NULL, '2026-05-15 13:14:49', '2026-05-15 13:14:49', 0.00, 0, NULL),
(296, 'kleosr', 'kleosr@proton.me', '/files/avatars/296_1778853144_6a07251899907.jpg', 'Si quieres algo bien hecho, dime. \nSi quieres gastar tiempo, contrata a otro.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '97de982c-052a-419a-8ec4-0b2b9293a8f4', 0, 0, 0, NULL, NULL, '2026-05-15 13:40:50', '2026-05-15 13:52:24', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"expert\"},{\"name\":\"TypeScript\",\"level\":\"expert\"},{\"name\":\"HTML\",\"level\":\"expert\"},{\"name\":\"CSS\",\"level\":\"expert\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"expert\"},{\"name\":\"MySQL\",\"level\":\"expert\"},{\"name\":\"AWS\",\"level\":\"advanced\"}]'),
(297, 'dokirl', 'dokirl50538@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5066c4ec-f79d-4ba1-a1ef-e1a96a84f3ab', 0, 0, 0, NULL, NULL, '2026-05-15 13:54:15', '2026-05-15 13:54:15', 0.00, 0, NULL),
(298, 'danielcordero', 'danielcordero1998@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '247b9a16-e99d-406f-aa6f-448e1fc6b285', 0, 0, 0, NULL, NULL, '2026-05-15 14:03:15', '2026-05-15 14:03:15', 0.00, 0, NULL),
(299, 'sergiogalvez', 'sergio.galvez@ug.uchile.cl', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8cdad829-d0cd-4935-9a77-390096940595', 0, 0, 0, NULL, NULL, '2026-05-15 14:13:50', '2026-05-15 14:13:50', 0.00, 0, NULL),
(300, 'ramiroalfano', 'ramiroalfano12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '434b5432-152e-447d-8f83-7d62ab537d78', 0, 0, 0, NULL, NULL, '2026-05-15 14:23:07', '2026-05-15 14:23:07', 0.00, 0, NULL),
(301, 'jhonatanbrito', 'jhonatanjesusbrito@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1d99566d-f9a7-4a87-8b16-2e924025b681', 0, 0, 0, NULL, NULL, '2026-05-15 16:25:29', '2026-05-15 16:25:29', 0.00, 0, NULL),
(302, 'fabriciomartinez', 'fabriciobaltazarmartinez@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0e2b2fd4-7aa6-438f-9e13-40087f90e84d', 0, 0, 0, NULL, NULL, '2026-05-15 17:39:43', '2026-05-15 17:39:43', 0.00, 0, NULL),
(303, 'Javiera Salazar', 'javierac.salazar1@gmail.com', NULL, 'Desarrolladora junior e Ingeniera en Informática, con experiencia en creación de interfaces, aplicaciones y sistemas de gestión. He participado en proyectos con React, Next.js, Electron, SQL y diseño en Figma. Me gusta transformar ideas en soluciones digitales funcionales, ordenadas y fáciles de usar.', 'https://github.com/Javierasalazar1', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1e77b3b7-b888-4492-a499-40f9b826d485', 0, 0, 0, NULL, NULL, '2026-05-15 17:57:59', '2026-05-15 18:03:20', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"PHP\",\"level\":\"beginner\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"Dart\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"beginner\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"}]'),
(304, 'juanpatricioalbornoz', 'juan.11236798@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd43da79d-9e7a-4b6a-9d5a-684eb3c0eb36', 0, 0, 0, NULL, NULL, '2026-05-15 18:02:05', '2026-05-15 18:02:05', 0.00, 0, NULL),
(305, 'yagomorales', 'moralesyago2@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '69843a46-0708-4a21-8a8f-3943780d58aa', 0, 0, 0, NULL, NULL, '2026-05-15 19:40:09', '2026-05-15 19:40:09', 0.00, 0, NULL),
(306, 'Pedro Riveros.Lab', 'pedroriveros.lab@gmail.com', '/files/avatars/306_1778874921_6a077a29053aa.jpg', 'Soy programador web egresado en la Tecnicatura Universitaria en Desarrollo Web (UNSL), con experiencia en el desarrollo de sistemas de gestión, integración de bases de datos y diseño de interfaces enfocadas en la usabilidad. He trabajado con tecnologías como PHP, CodeIgniter 4, JavaScript, Electron y he realizado prácticas con Go orientadas a la creación de bases simples y pequeñas APIs. Siempre priorizando soluciones limpias, funcionales y escalables.\n\nMi formación académica y proyectos reales me han permitido consolidar una visión integral del ciclo de desarrollo, aplicando el modelo MVC y metodologías de análisis y validación de requisitos. Me destaco por transformar procesos manuales en sistemas claros y eficientes, con foco en calidad y arquitectura sólida.', 'https://www.linkedin.com/in/pedro-riveros/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd8b1784c-7ff4-4de3-a4ed-2ac3dbc20e50', 0, 0, 0, NULL, NULL, '2026-05-15 19:49:47', '2026-05-15 20:00:34', 0.00, 0, '[{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"beginner\"},{\"name\":\"Swift\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Adobe XD\",\"level\":\"beginner\"},{\"name\":\"Photoshop\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"Spring\",\"level\":\"beginner\"},{\"name\":\"Go\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"intermediate\"}]'),
(307, 'maicoarias', 'maicoarias56@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '8551c771-d8f3-4c30-8b71-414e1d2d5a48', 0, 0, 0, NULL, NULL, '2026-05-15 21:21:35', '2026-05-19 00:46:45', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"beginner\"},{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"PHP\",\"level\":\"beginner\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Django\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"CSS\",\"level\":\"beginner\"},{\"name\":\"Vue.js\",\"level\":\"beginner\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Web3\",\"level\":\"beginner\"},{\"name\":\"Bitcoin\",\"level\":\"beginner\"},{\"name\":\"Ethereum\",\"level\":\"beginner\"},{\"name\":\"Blockchain\",\"level\":\"beginner\"}]'),
(308, 'deralex1000', 'deralex1000@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b07bc4cc-627f-486a-8efa-3b84a51b2706', 0, 0, 0, NULL, NULL, '2026-05-15 21:55:18', '2026-05-15 21:55:18', 0.00, 0, NULL),
(309, 'Juan Manuel Quintana', 'quintanajuanmanuel21@gmail.com', NULL, 'Tengo 24 años, programo para dispositivos móviles usando kotling  y actualmente estoy aprendiendo a usar flutter. También hago un poco de desarrollo web con Angular, con lo que podría hacer paginas webs sencillas y funcionales. Además uso Firebase como base de datos, lo que facilita ciertas cosas a la hora de trabajar.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'd29032ce-6c36-4bb3-83a7-75eec5f84a65', 0, 0, 0, NULL, NULL, '2026-05-15 22:26:43', '2026-05-15 22:36:11', 0.00, 0, '[{\"name\":\"Angular\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"advanced\"},{\"name\":\"Kotlin\",\"level\":\"advanced\"}]'),
(310, 'stivenalejandropovedalemus', 'stivenpoveda30sistema@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e9737681-a6af-4735-90c3-4146b73b939c', 0, 0, 0, NULL, NULL, '2026-05-15 23:25:14', '2026-05-15 23:25:14', 0.00, 0, NULL),
(311, 'albertoprez', 'contacto.adpmdev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fa2126f4-d41f-4c6f-b2cf-3ae7d14a6b47', 0, 0, 0, NULL, NULL, '2026-05-15 23:46:50', '2026-05-15 23:46:50', 0.00, 0, NULL),
(312, 'gustavocolina', 'gustavojose0819@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6c219dce-558f-44a6-a468-84acc685e6fe', 0, 0, 0, NULL, NULL, '2026-05-15 23:57:55', '2026-05-15 23:57:55', 0.00, 0, NULL),
(313, 'samuelcasanueva', 'djdarkpacman12345@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '806788d2-7545-4f23-858b-29c19e2ef449', 0, 0, 0, NULL, NULL, '2026-05-16 00:09:08', '2026-05-16 00:09:08', 0.00, 0, NULL),
(314, 'jonathandk', 'dkjonathan996@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'e5e07539-d2ad-4f97-872d-8bbc1e38ae34', 0, 0, 0, NULL, NULL, '2026-05-16 00:23:43', '2026-05-16 00:23:43', 0.00, 0, NULL),
(315, 'eazocar', 'azocarmel@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'f58088c6-5a4c-4d24-bb2c-385ca5e19467', 0, 0, 0, NULL, NULL, '2026-05-16 00:35:09', '2026-05-16 00:41:45', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"advanced\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"Express\",\"level\":\"advanced\"},{\"name\":\"REST API\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"GraphQL\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"beginner\"},{\"name\":\"MongoDB\",\"level\":\"advanced\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"Figma\",\"level\":\"beginner\"},{\"name\":\"Solidity\",\"level\":\"beginner\"},{\"name\":\"Web3\",\"level\":\"beginner\"}]'),
(316, 'aarongil', 'htlgil41@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '480d49f7-6b31-4ef1-bde1-f59325631f49', 0, 0, 0, NULL, NULL, '2026-05-16 00:36:02', '2026-05-16 00:36:02', 0.00, 0, NULL),
(317, 'abrahamvaldiviaborges', 'avaldiviaborges@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a66c7e0a-db7e-4df7-99a5-7cc07f808db9', 0, 0, 0, NULL, NULL, '2026-05-16 00:43:38', '2026-05-16 00:43:38', 0.00, 0, NULL),
(318, 'nicoagustingz', 'nicoagustingz@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '44c8eaba-25c9-4724-a564-663a400326dc', 0, 0, 0, NULL, NULL, '2026-05-16 01:09:32', '2026-05-16 01:09:32', 0.00, 0, NULL),
(319, 'luisxavier041', 'luisxavier041@gmail.com', NULL, 'Desarrollador con sólida base técnica en programación web y especialista en la organización y análisis de datos mediante Microsoft Excel y Power BI. Cuento con experiencia en el manejo de lenguajes como PHP, Python y SQL, además de conocimientos en soporte técnico de hardware. Poseo una amplia trayectoria en atención al cliente, lo que me permite combinar la resolución de problemas técnicos con un enfoque orientado a la eficiencia y el trabajo en equipo.', 'https://www.linkedin.com/safety/go/?url=https%3A%2F%2Freivaxlm%2Egithub%2Eio%2FPortafolio%2F&urlhash=BDlF&mt=PYqx_ZQxZkEZ6Rl9dw5ZvDDi5sGy2zWAqaxmft0FvtdGz1frUEAAXm1YWfaM2qM9afLl87Zezv2m1RhoBq9RNWMcHfk6&isSdui=true', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '22131c3c-0145-49cd-ab82-acd01913406e', 0, 0, 0, NULL, NULL, '2026-05-16 01:13:26', '2026-05-16 01:37:30', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"C++\",\"level\":\"intermediate\"},{\"name\":\"C#\",\"level\":\"intermediate\"},{\"name\":\"Dart\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"intermediate\"}]'),
(320, 'axelmendoza', 'am606axel@gmail.com', NULL, 'Desarrollador Web y estudiante de 10mo semestre de Ingeniería Informática. Especializado en el ecosistema JavaScript (Node.js, Express, MongoDB). Tengo experiencia construyendo plataformas e-commerce desde cero, gestionando la arquitectura de bases de datos, APIs REST y operaciones CRUD. Me enfoco en desarrollar soluciones backend eficientes y código limpio. Listo para aportar valor en microtareas y proyectos dinámicos.', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'be78e80a-0a3b-4a42-8979-0e930b15ffdc', 0, 0, 0, NULL, NULL, '2026-05-16 02:23:18', '2026-05-20 00:41:02', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Express\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"MongoDB\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"intermediate\"},{\"name\":\"Photoshop\",\"level\":\"beginner\"},{\"name\":\"Illustrator\",\"level\":\"beginner\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"}]'),
(321, 'carloseduardogonzalezhenriquez', 'cargonzalez0601@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '0893180b-caba-4b54-8681-07754de21b08', 0, 0, 0, NULL, NULL, '2026-05-16 05:37:37', '2026-05-16 05:37:37', 0.00, 0, NULL),
(322, 'kperez90112', 'kperez90112@ufide.ac.cr', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5a499f86-2e8c-4652-9570-21cd171930cc', 0, 0, 0, NULL, NULL, '2026-05-16 07:23:42', '2026-05-16 07:23:42', 0.00, 0, NULL),
(323, 'nelsonmolina', 'nmolprogramer@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a19fef7f-f518-4a9a-a975-2ad8da45dff4', 0, 0, 0, NULL, NULL, '2026-05-16 11:36:39', '2026-05-16 11:36:39', 0.00, 0, NULL),
(324, 'carlosalvaro', 'carlos.alvaro.ant55@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '68de27be-185e-41db-900d-4ddc57fc2bf1', 0, 0, 0, NULL, NULL, '2026-05-16 12:58:43', '2026-05-16 12:58:43', 0.00, 0, NULL),
(325, 'alexiskremis', 'alexiskremis@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '219f8215-0ccc-47aa-bbf3-f4d0ee93401a', 0, 0, 0, NULL, NULL, '2026-05-16 14:33:41', '2026-05-16 14:33:41', 0.00, 0, NULL),
(326, 'martinsarraciniontivero', 'martinsarraciniontivero@gmail.com', NULL, 'Me llamo Martin, tengo 21 años y estudio la Licenciatura en programación informática en la UNQ de Quilmes, Buenos Aires, Argentina. \nJAVA -> Arranque este año con este lenguaje y es muy básico lo que se hacer.\nPYTHON -> Hice un curso hace unas semanas, se lo básico y ya arranque a hacer proyectos personales con este lenguaje.\nPostgreSQL -> Curse una materia con este lenguaje y vi los pilares fundamentales sobre las bases de datos.', NULL, 0, 0, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fc789772-5518-4f97-8e9e-ccc56b42d390', 0, 0, 0, NULL, NULL, '2026-05-16 15:26:34', '2026-05-16 15:37:07', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"beginner\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"beginner\"}]'),
(327, 'axelnez', 'aranuo23@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '6c663fc7-6be0-4653-ae8f-6064d18c8a5d', 0, 0, 0, NULL, NULL, '2026-05-16 16:12:07', '2026-05-16 16:12:07', 0.00, 0, NULL),
(328, 'danielmamani', 'danymamani1002@gmail.com', NULL, 'Desarrollador Backend y estudiante de 4to año de Ingeniería en Informática. Me especializo en la construcción de arquitecturas escalables y soluciones end-to-end. Manejo sólido de Node.js, PostgreSQL y despliegue de infraestructura con Linux y Docker. Con mentalidad de \'builder\' y fuerte enfoque en el ecosistema Web3, automatización e integración de tecnologías emergentes (Rust, Smart Contracts). Capacidad para investigar, prototipar y llevar ideas a producción de forma autónoma.', 'https://daniel-mamani.vercel.app', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '82f39337-7999-4d98-b495-e602dabe4635', 0, 0, 0, NULL, NULL, '2026-05-16 16:23:59', '2026-05-16 16:34:38', 0.00, 0, '[{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"intermediate\"},{\"name\":\"Rust\",\"level\":\"intermediate\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Express\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"Linux\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"intermediate\"},{\"name\":\"CSS\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"Angular\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"intermediate\"}]'),
(329, 'Fulanito', 'prueba@arcus.com', NULL, NULL, 'https://sandia-portfolio.web.app/', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7bb5ee0a-90b3-4be3-be08-e7c01cdcccb4', 0, 0, 0, NULL, NULL, '2026-05-16 16:56:54', '2026-05-16 17:07:36', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"Java\",\"level\":\"beginner\"},{\"name\":\"C#\",\"level\":\"beginner\"},{\"name\":\"Dart\",\"level\":\"beginner\"},{\"name\":\"Node.js\",\"level\":\"intermediate\"},{\"name\":\"Laravel\",\"level\":\"beginner\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"intermediate\"},{\"name\":\"Linux\",\"level\":\"advanced\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"SASS\",\"level\":\"advanced\"},{\"name\":\"React\",\"level\":\"advanced\"},{\"name\":\"Next.js\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"PostgreSQL\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"}]'),
(330, 'agustinlamas', 'aguslamas46@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '465ca719-694a-4884-bdb4-f4bb382539b6', 0, 0, 0, NULL, NULL, '2026-05-16 17:03:57', '2026-05-16 17:03:57', 0.00, 0, NULL),
(331, 'elmersolizpatzi', 'solizpatzi@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '74b3ff68-f1e4-4a59-914a-36b2d7ad19e9', 0, 0, 0, NULL, NULL, '2026-05-16 20:58:20', '2026-05-16 20:58:20', 0.00, 0, NULL),
(332, 'edwinrodriguez', 'edwinerd.394@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'c38b09d7-ac0c-4212-9aec-3ae92e1ecc80', 0, 0, 0, NULL, NULL, '2026-05-16 22:21:40', '2026-05-16 22:21:40', 0.00, 0, NULL),
(333, 'braulioortega', 'brauliortegabatalla@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ead2aad6-4f5f-4794-80c4-7793beedb527', 0, 0, 0, NULL, NULL, '2026-05-16 23:56:55', '2026-05-16 23:56:55', 0.00, 0, NULL),
(342, 'arcus', 'arcusproyect@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b7d59f54-224f-4cd0-b566-eec4cbd39557', 0, 0, 0, NULL, NULL, '2026-05-18 02:40:18', '2026-05-18 02:40:18', 0.00, 0, NULL),
(343, 'agustingomez999js', 'agustingomez999js@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '609223b5-ba03-4ffd-8502-b687794987f6', 0, 0, 0, NULL, NULL, '2026-05-18 03:03:50', '2026-05-18 03:03:50', 0.00, 0, NULL),
(344, 'joseantoniopirolo', 'joseantoniopirolo@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '5368db43-e3fd-4e8f-97a5-5765e5041ef9', 0, 0, 0, NULL, NULL, '2026-05-18 07:31:26', '2026-05-18 07:31:26', 0.00, 0, NULL),
(345, 'oscargausscarvajalyucra', 'oscargausscarvajal@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '592f0b98-4721-4156-8fb7-9e172fae92d6', 0, 0, 0, NULL, NULL, '2026-05-18 23:58:28', '2026-05-18 23:58:28', 0.00, 0, NULL),
(346, 'enyerberrangel', 'enyerber045@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', 'GBA3CK2FXZSAUK22WTW7FNFLT5BH7KR5DFH3HBGATH7QIKPBWP7J6DXW', 0, NULL, NULL, NULL, 'e843800f-9eba-4b39-b094-34e375a006ee', 0, 0, 0, NULL, NULL, '2026-05-19 00:21:46', '2026-05-19 01:11:42', 0.00, 0, '[{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"},{\"name\":\"Redis\",\"level\":\"beginner\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"SCSS\",\"level\":\"advanced\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"Django\",\"level\":\"intermediate\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"Linux\",\"level\":\"advanced\"},{\"name\":\"Git\",\"level\":\"advanced\"}]'),
(347, 'fernandodelvalle', 'fernandodelvalle1244@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fb56963a-47ce-4b34-8b7f-623863156b3b', 0, 0, 0, NULL, NULL, '2026-05-19 17:09:50', '2026-05-19 17:09:50', 0.00, 0, NULL),
(348, 'abnervazquezmorales', 'abnerv24@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '82e78284-fdff-46f2-a158-42c1248601b8', 0, 0, 0, NULL, NULL, '2026-05-19 20:33:21', '2026-05-19 20:33:21', 0.00, 0, NULL),
(349, 'josegutierrez', 'josearmandog02@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '82f9eb2d-b56c-4735-b4f8-dac649ccb7d3', 0, 0, 0, NULL, NULL, '2026-05-20 00:40:24', '2026-05-20 00:40:24', 0.00, 0, NULL),
(350, 'yordicastro', 'jordycastro1756@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '864984ad-af44-4545-9365-51c47d341c37', 0, 0, 0, NULL, NULL, '2026-05-20 04:53:06', '2026-05-20 04:53:06', 0.00, 0, NULL),
(351, 'Y3LG', 'y3lgworld@gmail.com', '/files/avatars/351_1779323242_6a0e516a1fbf1.jpeg', 'Devops Engineer', NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '426d2f00-ff31-43ce-948b-13e1ca36b3d5', 0, 0, 0, NULL, NULL, '2026-05-21 00:26:43', '2026-05-21 00:30:00', 0.00, 0, '[{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"intermediate\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"expert\"},{\"name\":\"HTML\",\"level\":\"expert\"},{\"name\":\"CSS\",\"level\":\"expert\"},{\"name\":\"React\",\"level\":\"intermediate\"},{\"name\":\"Next.js\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"advanced\"},{\"name\":\"UI\\/UX Design\",\"level\":\"intermediate\"},{\"name\":\"Figma\",\"level\":\"intermediate\"},{\"name\":\"Adobe XD\",\"level\":\"intermediate\"},{\"name\":\"Photoshop\",\"level\":\"advanced\"},{\"name\":\"Illustrator\",\"level\":\"advanced\"}]'),
(352, 'miguel', 'krecioch07@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a987b8c0-ac0f-4ed0-a583-ee64b7371440', 0, 0, 0, NULL, NULL, '2026-05-21 06:40:21', '2026-05-21 06:40:21', 0.00, 0, NULL),
(353, 'josdanielvargasbriceo', 'josevargasrm12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '90b7417d-3681-4a2c-94af-95c7a87d5124', 0, 0, 0, NULL, NULL, '2026-05-21 18:25:28', '2026-05-21 18:25:28', 0.00, 0, NULL),
(354, 'brauliocanosoto', 'uchimurabraulio@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'ecb6ae01-f2f7-41c6-a0c0-75258facb4fb', 0, 0, 0, NULL, NULL, '2026-05-21 18:26:13', '2026-05-21 18:26:13', 0.00, 0, NULL),
(355, 'darioalessandroplazaleon', 'darioalessandrop@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b5a6016d-0109-44b3-92e4-bb38941f24be', 0, 0, 0, NULL, NULL, '2026-05-21 20:52:15', '2026-05-21 20:52:15', 0.00, 0, NULL),
(356, 'fuadacevedo', 'fuaxxxx@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '2b53ad2e-36d0-400a-bc32-01650f335166', 0, 0, 0, NULL, NULL, '2026-05-21 23:34:27', '2026-05-21 23:34:27', 0.00, 0, NULL),
(357, 'ronaldocortes', 'ronaldocortes860@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'fb96af67-7786-450f-8293-0674663634b5', 0, 0, 0, NULL, NULL, '2026-05-21 23:47:03', '2026-05-21 23:47:03', 0.00, 0, NULL),
(358, 'andrsvalenzuela', 'andres_vo@yahoo.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '923e1f85-d454-4eb6-9913-22ecc1efe035', 0, 0, 0, NULL, NULL, '2026-05-22 00:32:24', '2026-05-22 00:32:24', 0.00, 0, NULL),
(359, 'noemiinsaurralde27', 'noeescurra88@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'dddfac74-04d7-4059-84ea-c3be509775b1', 0, 0, 0, NULL, NULL, '2026-05-22 01:05:59', '2026-05-22 01:05:59', 0.00, 0, NULL),
(360, 'gonzalohexacore', 'gonzalo.schnake2@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '4b553fbd-3ce9-4b7f-824f-90f4cc2f9d09', 0, 0, 0, NULL, NULL, '2026-05-22 18:11:51', '2026-05-22 18:11:51', 0.00, 0, NULL),
(361, 'leonardonoa', 'leonardonoa803@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '29e61d59-2c5c-4461-97c8-41c7d0a6c92c', 0, 0, 0, NULL, NULL, '2026-05-22 18:17:28', '2026-05-22 18:17:28', 0.00, 0, NULL),
(362, 'jorgepizarrocallejas', 'jpizarrocallejas@gmail.com', '/files/avatars/362_1779493258_6a10e98abd84d.jpg', NULL, 'https://www.behance.net/gallery/226528041/Portafolio-web-de-Jorge-Pizarro-Callejas', 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '898df430-d0cd-4342-92d4-b40c12789041', 0, 0, 0, NULL, NULL, '2026-05-22 23:40:05', '2026-05-22 23:46:30', 0.00, 0, '[{\"name\":\"JavaScript\",\"level\":\"advanced\"},{\"name\":\"PHP\",\"level\":\"advanced\"},{\"name\":\"TypeScript\",\"level\":\"intermediate\"},{\"name\":\"Python\",\"level\":\"advanced\"},{\"name\":\"Java\",\"level\":\"advanced\"},{\"name\":\"Django\",\"level\":\"beginner\"},{\"name\":\"Git\",\"level\":\"advanced\"},{\"name\":\"Linux\",\"level\":\"expert\"},{\"name\":\"Node.js\",\"level\":\"advanced\"},{\"name\":\"REST API\",\"level\":\"intermediate\"},{\"name\":\"HTML\",\"level\":\"advanced\"},{\"name\":\"CSS\",\"level\":\"advanced\"},{\"name\":\"Angular\",\"level\":\"intermediate\"},{\"name\":\"Vue.js\",\"level\":\"intermediate\"},{\"name\":\"React\",\"level\":\"beginner\"},{\"name\":\"PostgreSQL\",\"level\":\"advanced\"},{\"name\":\"MySQL\",\"level\":\"advanced\"},{\"name\":\"Redis\",\"level\":\"beginner\"},{\"name\":\"Docker\",\"level\":\"intermediate\"},{\"name\":\"AWS\",\"level\":\"intermediate\"},{\"name\":\"UI\\/UX Design\",\"level\":\"beginner\"}]'),
(363, 'constanzacabello', 'cony478@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'eac62587-90d1-48c0-9316-6571932bb07d', 0, 0, 0, NULL, NULL, '2026-05-23 01:57:34', '2026-05-23 01:57:34', 0.00, 0, NULL),
(364, 'vctoraranguren', 'victoraranguren.dev@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '908a12c3-4a6d-49bb-b138-3f8390b5e732', 0, 0, 0, NULL, NULL, '2026-05-23 02:40:56', '2026-05-23 02:40:56', 0.00, 0, NULL),
(365, 'juanandrscentellesdiez', 'jtheoden@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'af3a6795-bb14-476a-95da-2a676fb0caa4', 0, 0, 0, NULL, NULL, '2026-05-23 03:44:17', '2026-05-23 03:44:17', 0.00, 0, NULL),
(366, 'jennyt', 'jennyt.xlm@proton.me', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', 'GBXZELDK5A3PPDBBFDBIAO5I3GYLAEYJ427KWWSCXWGGRDOTVKHEXLTM', 0, NULL, NULL, NULL, '51fffdcc-596d-4f98-9e04-5fdb1c5ec3ba', 0, 0, 0, NULL, NULL, '2026-05-24 17:14:17', '2026-05-24 17:20:22', 0.00, 0, NULL),
(367, 'juanfarias', 'kazuha27082001@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'a8d4a96e-b431-4df4-bfae-7338df0e8c4f', 0, 0, 0, NULL, NULL, '2026-05-26 01:23:15', '2026-05-26 01:23:15', 0.00, 0, NULL),
(368, 'julianjosevillarroelmujica', 'j.juliaco@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '11141fed-98db-4cdd-b441-64ffb9c66c32', 0, 0, 0, NULL, NULL, '2026-05-26 01:34:00', '2026-05-26 01:34:00', 0.00, 0, NULL),
(369, 'jaimeangelcruz', 'jaimeangelcruz12@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, 'b9e94a78-5486-4e3c-8f92-fa6c683f317f', 0, 0, 0, NULL, NULL, '2026-05-26 23:00:32', '2026-05-26 23:00:32', 0.00, 0, NULL),
(370, 'lilyeipictures', 'javape793@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '7e5cc5d1-2398-48ab-b771-cf037d55da91', 0, 0, 0, NULL, NULL, '2026-05-27 00:59:22', '2026-05-27 00:59:22', 0.00, 0, NULL),
(371, 'jesserp', 'marvaljess2000@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '9931a1c2-c751-47f9-b2a0-065f06448071', 0, 0, 0, NULL, NULL, '2026-05-27 22:25:03', '2026-05-27 22:25:03', 0.00, 0, NULL),
(372, 'victoremmanuel', 'emmanuelvik123@gmail.com', NULL, NULL, NULL, 0, 1, NULL, 'user', 0, '', NULL, 0, NULL, NULL, NULL, '1b2338ca-30ee-443a-9706-34a6b9902055', 0, 0, 0, NULL, NULL, '2026-05-28 17:51:59', '2026-05-28 17:51:59', 0.00, 0, NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_portfolio`
--

CREATE TABLE `user_portfolio` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `project_url` varchar(500) DEFAULT NULL,
  `category` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_skills`
--

CREATE TABLE `user_skills` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `skill_name` varchar(100) NOT NULL,
  `skill_level` enum('beginner','intermediate','advanced','expert') DEFAULT 'intermediate',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `user_statistics`
--

CREATE TABLE `user_statistics` (
  `user_id` int(11) NOT NULL,
  `tasks_completed` int(11) DEFAULT 0,
  `tasks_created` int(11) DEFAULT 0,
  `total_earned` decimal(18,8) DEFAULT 0.00000000,
  `total_spent` decimal(18,8) DEFAULT 0.00000000,
  `average_rating` decimal(3,2) DEFAULT 0.00,
  `total_ratings` int(11) DEFAULT 0,
  `completion_rate` decimal(5,2) DEFAULT 0.00,
  `response_time_avg` varchar(50) DEFAULT NULL,
  `last_calculated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_id` (`admin_id`),
  ADD KEY `idx_action` (`action`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indices de la tabla `applications`
--
ALTER TABLE `applications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_task_applicant` (`task_id`,`applicant_id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_applicant_id` (`applicant_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indices de la tabla `disputes`
--
ALTER TABLE `disputes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `resolved_by` (`resolved_by`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_created_by` (`created_by`);

--
-- Indices de la tabla `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_id` (`task_id`),
  ADD KEY `idx_sender_id` (`sender_id`),
  ADD KEY `idx_receiver_id` (`receiver_id`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indices de la tabla `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_is_read` (`is_read`);

--
-- Indices de la tabla `ratings`
--
ALTER TABLE `ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_rating` (`task_id`,`rater_id`,`rated_id`),
  ADD KEY `rater_id` (`rater_id`),
  ADD KEY `rated_id` (`rated_id`),
  ADD KEY `idx_ratings_created` (`created_at`);

--
-- Indices de la tabla `system_config`
--
ALTER TABLE `system_config`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `config_key` (`config_key`),
  ADD KEY `updated_by` (`updated_by`);

--
-- Indices de la tabla `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_status` (`status`),
  ADD KEY `idx_accepted_applicant_id` (`accepted_applicant_id`),
  ADD KEY `idx_escrow_id` (`escrow_id`),
  ADD KEY `idx_escrow_status` (`escrow_status`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_soroban_escrow_id` (`soroban_escrow_id`),
  ADD KEY `idx_contract_id` (`contract_id`),
  ADD KEY `idx_worker_started_at` (`worker_started_at`),
  ADD KEY `idx_cancellation_initiated_by` (`cancellation_initiated_by`);

--
-- Indices de la tabla `task_progress`
--
ALTER TABLE `task_progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `idx_task_user` (`task_id`,`user_id`),
  ADD KEY `idx_task_type` (`task_id`,`progress_type`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_email` (`email`),
  ADD KEY `idx_wallet_address` (`wallet_address`),
  ADD KEY `idx_supabase_user_id` (`supabase_user_id`),
  ADD KEY `idx_role` (`role`),
  ADD KEY `idx_is_admin` (`is_admin`),
  ADD KEY `idx_users_rating` (`average_rating`),
  ADD KEY `idx_users_verified` (`verified`),
  ADD KEY `idx_users_public_profile` (`public_profile`);

--
-- Indices de la tabla `user_portfolio`
--
ALTER TABLE `user_portfolio`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_category` (`category`);

--
-- Indices de la tabla `user_skills`
--
ALTER TABLE `user_skills`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_user_skill` (`user_id`,`skill_name`),
  ADD KEY `idx_user_id` (`user_id`),
  ADD KEY `idx_skill_level` (`skill_level`);

--
-- Indices de la tabla `user_statistics`
--
ALTER TABLE `user_statistics`
  ADD PRIMARY KEY (`user_id`),
  ADD KEY `idx_tasks_completed` (`tasks_completed`),
  ADD KEY `idx_average_rating` (`average_rating`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=383;

--
-- AUTO_INCREMENT de la tabla `applications`
--
ALTER TABLE `applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=164;

--
-- AUTO_INCREMENT de la tabla `disputes`
--
ALTER TABLE `disputes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT de la tabla `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT de la tabla `ratings`
--
ALTER TABLE `ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `system_config`
--
ALTER TABLE `system_config`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=112;

--
-- AUTO_INCREMENT de la tabla `task_progress`
--
ALTER TABLE `task_progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=373;

--
-- AUTO_INCREMENT de la tabla `user_portfolio`
--
ALTER TABLE `user_portfolio`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `user_skills`
--
ALTER TABLE `user_skills`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD CONSTRAINT `admin_logs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `applications`
--
ALTER TABLE `applications`
  ADD CONSTRAINT `applications_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `applications_ibfk_2` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `disputes`
--
ALTER TABLE `disputes`
  ADD CONSTRAINT `disputes_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `disputes_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `disputes_ibfk_3` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `messages`
--
ALTER TABLE `messages`
  ADD CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `messages_ibfk_3` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `ratings`
--
ALTER TABLE `ratings`
  ADD CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`),
  ADD CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`rater_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `ratings_ibfk_3` FOREIGN KEY (`rated_id`) REFERENCES `users` (`id`);

--
-- Filtros para la tabla `system_config`
--
ALTER TABLE `system_config`
  ADD CONSTRAINT `system_config_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `tasks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tasks_ibfk_2` FOREIGN KEY (`accepted_applicant_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `task_progress`
--
ALTER TABLE `task_progress`
  ADD CONSTRAINT `task_progress_ibfk_1` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `task_progress_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_portfolio`
--
ALTER TABLE `user_portfolio`
  ADD CONSTRAINT `user_portfolio_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_skills`
--
ALTER TABLE `user_skills`
  ADD CONSTRAINT `user_skills_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `user_statistics`
--
ALTER TABLE `user_statistics`
  ADD CONSTRAINT `user_statistics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
